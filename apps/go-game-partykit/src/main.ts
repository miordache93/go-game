import type * as Party from 'partykit/server';
import { GameEngine } from '@go-game/game';
import {
  type ClientToServerMessage,
  type ServerToClientMessage,
  type PlayerInfo,
  type RoomState,
  ClientMessageType,
  ServerMessageType,
  PlayerRole,
  ErrorCode,
} from '@go-game/partykit-protocol';
import { Player, GamePhase, MoveType } from '@go-game/types';

export default class GoGameServer implements Party.Server {
  private roomState: RoomState;
  private gameEngine: GameEngine;
  private connections: Map<string, Party.Connection> = new Map();
  private gameStartTime: Date | null = null;
  private moves: any[] = [];

  constructor(public room: Party.Room) {
    // Initialize game engine
    this.gameEngine = new GameEngine({
      boardSize: 19,
      komi: 6.5,
      gameType: 'online',
      players: {
        black: 'Player 1',
        white: 'Player 2',
      },
    });

    // Initialize room state
    this.roomState = {
      id: room.id,
      gameState: this.gameEngine.getGameState(),
      players: new Map(),
      blackPlayerId: null,
      whitePlayerId: null,
      spectators: new Set(),
      undoRequest: null,
      createdAt: new Date(),
      lastActivity: new Date(),
    };
  }

  async onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
    console.log(`[${this.room.id}] New connection: ${connection.id}`);
    
    // Store connection
    this.connections.set(connection.id, connection);
    
    // Send initial room info
    this.sendRoomInfo(connection);
  }

  async onMessage(message: string, sender: Party.Connection) {
    this.roomState.lastActivity = new Date();
    
    try {
      const msg = JSON.parse(message) as ClientToServerMessage;
      console.log(`[${this.room.id}] Message from ${sender.id}:`, msg.type);

      switch (msg.type) {
        case ClientMessageType.JOIN:
          await this.handleJoin(msg, sender);
          break;
        case ClientMessageType.MAKE_MOVE:
          await this.handleMakeMove(msg, sender);
          break;
        case ClientMessageType.PASS:
          await this.handlePass(sender);
          break;
        case ClientMessageType.RESIGN:
          await this.handleResign(sender);
          break;
        case ClientMessageType.MARK_DEAD:
          await this.handleMarkDead(msg, sender);
          break;
        case ClientMessageType.FINALIZE_GAME:
          await this.handleFinalizeGame(sender);
          break;
        case ClientMessageType.RESUME_PLAYING:
          await this.handleResumePlaying(sender);
          break;
        case ClientMessageType.CHAT_MESSAGE:
          await this.handleChatMessage(msg, sender);
          break;
        default:
          this.sendError(sender, 'Unknown message type', ErrorCode.INVALID_MESSAGE);
      }
    } catch (error) {
      console.error(`[${this.room.id}] Error processing message:`, error);
      this.sendError(sender, 'Failed to process message', ErrorCode.INVALID_MESSAGE);
    }
  }

  async onClose(connection: Party.Connection) {
    console.log(`[${this.room.id}] Connection closed: ${connection.id}`);
    
    // Remove from connections
    this.connections.delete(connection.id);
    
    // Handle player disconnection
    const player = this.roomState.players.get(connection.id);
    if (player) {
      player.isConnected = false;
      
      // Notify others
      this.broadcast({
        type: ServerMessageType.PLAYER_LEFT,
        playerId: connection.id,
        timestamp: Date.now(),
      }, connection.id);
    }
    
    // Remove from spectators if applicable
    this.roomState.spectators.delete(connection.id);
  }

  // ==========================================
  // MESSAGE HANDLERS
  // ==========================================

  private async handleJoin(msg: ClientToServerMessage & { type: ClientMessageType.JOIN }, sender: Party.Connection) {
    const playerInfo: PlayerInfo = {
      id: sender.id,
      name: msg.playerInfo.name,
      role: PlayerRole.SPECTATOR,
      isConnected: true,
      userId: msg.playerInfo.userId,
    };

    // Try to assign requested role
    if (msg.requestedRole) {
      if (this.canAssignRole(msg.requestedRole)) {
        playerInfo.role = msg.requestedRole;
        this.assignRole(sender.id, msg.requestedRole);
      }
    } else {
      // Auto-assign if spots available
      if (!this.roomState.blackPlayerId) {
        playerInfo.role = PlayerRole.BLACK_PLAYER;
        this.assignRole(sender.id, PlayerRole.BLACK_PLAYER);
      } else if (!this.roomState.whitePlayerId) {
        playerInfo.role = PlayerRole.WHITE_PLAYER;
        this.assignRole(sender.id, PlayerRole.WHITE_PLAYER);
      }
    }

    // Add to players
    this.roomState.players.set(sender.id, playerInfo);
    
    // Add to spectators if not a player
    if (playerInfo.role === PlayerRole.SPECTATOR) {
      this.roomState.spectators.add(sender.id);
    }

    // Send role assignment
    this.send(sender, {
      type: ServerMessageType.ROLE_ASSIGNED,
      role: playerInfo.role,
      playerId: sender.id,
      timestamp: Date.now(),
    });

    // Send current game state
    this.send(sender, {
      type: ServerMessageType.GAME_STATE_UPDATE,
      gameState: this.roomState.gameState,
      players: Array.from(this.roomState.players.values()),
      timestamp: Date.now(),
    });

    // Notify others
    this.broadcast({
      type: ServerMessageType.PLAYER_JOINED,
      player: playerInfo,
      timestamp: Date.now(),
    }, sender.id);

    // Start game if both players joined and game hasn't started
    if (this.roomState.blackPlayerId && this.roomState.whitePlayerId && 
        this.roomState.gameState.phase === GamePhase.PLAYING && 
        this.roomState.gameState.moveHistory.length === 0) {
      this.startGame();
    }
  }

  private async handleMakeMove(msg: ClientToServerMessage & { type: ClientMessageType.MAKE_MOVE }, sender: Party.Connection) {
    // Validate sender is current player
    if (!this.isCurrentPlayer(sender.id)) {
      this.sendError(sender, 'Not your turn', ErrorCode.NOT_YOUR_TURN);
      return;
    }

    // Validate game is in playing phase
    if (this.roomState.gameState.phase !== GamePhase.PLAYING) {
      this.sendError(sender, 'Game is not in playing phase', ErrorCode.GAME_NOT_STARTED);
      return;
    }

    // Try to make move
    const currentPlayer = this.roomState.gameState.currentPlayer;
    const moveResult = this.gameEngine.makeMove(currentPlayer, MoveType.PLACE_STONE, msg.position);
    
    if (!moveResult.success) {
      this.send(sender, {
        type: ServerMessageType.INVALID_MOVE,
        reason: moveResult.error || 'Invalid move',
        position: msg.position,
        timestamp: Date.now(),
      });
      return;
    }

    // Update room state
    this.roomState.gameState = this.gameEngine.getGameState();
    
    // Record move for history
    if (moveResult.move) {
      this.moves.push({
        ...moveResult.move,
        timestamp: new Date(),
        capturedStones: moveResult.capturedStones
      });
    }

    // Broadcast move to all players
    this.broadcast({
      type: ServerMessageType.MOVE_MADE,
      move: moveResult.move!,
      gameState: this.roomState.gameState,
      capturedStones: moveResult.capturedStones,
      timestamp: Date.now(),
    });
  }

  private async handlePass(sender: Party.Connection) {
    if (!this.isCurrentPlayer(sender.id)) {
      this.sendError(sender, 'Not your turn', ErrorCode.NOT_YOUR_TURN);
      return;
    }

    const currentPlayer = this.roomState.gameState.currentPlayer;
    const passResult = this.gameEngine.makeMove(currentPlayer, MoveType.PASS);
    
    if (!passResult.success) {
      this.sendError(sender, passResult.error || 'Cannot pass', ErrorCode.INVALID_MOVE);
      return;
    }

    // Update room state
    this.roomState.gameState = this.gameEngine.getGameState();

    // Check if game moved to scoring phase
    if (this.roomState.gameState.phase === GamePhase.SCORING) {
      this.broadcast({
        type: ServerMessageType.SCORING_STARTED,
        timestamp: Date.now(),
      });
    }

    // Broadcast move
    this.broadcast({
      type: ServerMessageType.MOVE_MADE,
      move: passResult.move!,
      gameState: this.roomState.gameState,
      timestamp: Date.now(),
    });
  }

  private async handleResign(sender: Party.Connection) {
    const player = this.getPlayerBySender(sender.id);
    if (!player) {
      this.sendError(sender, 'You are not a player', ErrorCode.UNAUTHORIZED);
      return;
    }

    const resignResult = this.gameEngine.makeMove(player, MoveType.RESIGN);
    
    if (!resignResult.success) {
      this.sendError(sender, resignResult.error || 'Cannot resign', ErrorCode.INVALID_MOVE);
      return;
    }

    // Update room state
    this.roomState.gameState = this.gameEngine.getGameState();

    // Broadcast game end - the winner is the opponent of the resigning player
    const winner = player === Player.BLACK ? Player.WHITE : Player.BLACK;
    this.broadcast({
      type: ServerMessageType.GAME_ENDED,
      winner,
      reason: 'resignation',
      finalScore: this.roomState.gameState.score,
      timestamp: Date.now(),
    });
    
    // Save game to backend
    await this.saveGameToBackend();
  }

  private async handleMarkDead(msg: ClientToServerMessage & { type: ClientMessageType.MARK_DEAD }, sender: Party.Connection) {
    if (!this.isPlayer(sender.id)) {
      this.sendError(sender, 'Only players can mark dead stones', ErrorCode.UNAUTHORIZED);
      return;
    }

    if (this.roomState.gameState.phase !== GamePhase.SCORING) {
      this.sendError(sender, 'Not in scoring phase', ErrorCode.GAME_NOT_STARTED);
      return;
    }

    const markResult = this.gameEngine.markDeadStones(msg.position);
    
    if (!markResult) {
      this.sendError(sender, 'Cannot mark stone', ErrorCode.INVALID_MOVE);
      return;
    }

    // Update room state
    this.roomState.gameState = this.gameEngine.getGameState();

    // Broadcast dead stones update
    this.broadcast({
      type: ServerMessageType.DEAD_STONES_MARKED,
      deadStones: Array.from(this.gameEngine.getDeadStones()),
      gameState: this.roomState.gameState,
      timestamp: Date.now(),
    });
  }

  private async handleFinalizeGame(sender: Party.Connection) {
    if (!this.isPlayer(sender.id)) {
      this.sendError(sender, 'Only players can finalize the game', ErrorCode.UNAUTHORIZED);
      return;
    }

    const finalizeResult = this.gameEngine.finalizeGame();
    
    if (!finalizeResult.success) {
      this.sendError(sender, finalizeResult.error || 'Cannot finalize game', ErrorCode.INVALID_MOVE);
      return;
    }

    // Update room state
    this.roomState.gameState = this.gameEngine.getGameState();

    // Broadcast game finalized
    this.broadcast({
      type: ServerMessageType.GAME_FINALIZED,
      gameState: this.roomState.gameState,
      finalScore: this.roomState.gameState.score!,
      timestamp: Date.now(),
    });
    
    // Save game to backend
    await this.saveGameToBackend();
  }

  private async handleResumePlaying(sender: Party.Connection) {
    if (!this.isPlayer(sender.id)) {
      this.sendError(sender, 'Only players can resume playing', ErrorCode.UNAUTHORIZED);
      return;
    }

    const resumeResult = this.gameEngine.resumePlaying();
    
    if (!resumeResult.success) {
      this.sendError(sender, resumeResult.error || 'Cannot resume playing', ErrorCode.INVALID_MOVE);
      return;
    }

    // Update room state
    this.roomState.gameState = this.gameEngine.getGameState();

    // Broadcast game resumed
    this.broadcast({
      type: ServerMessageType.GAME_RESUMED,
      timestamp: Date.now(),
    });

    // Send updated game state
    this.broadcast({
      type: ServerMessageType.GAME_STATE_UPDATE,
      gameState: this.roomState.gameState,
      players: Array.from(this.roomState.players.values()),
      timestamp: Date.now(),
    });
  }

  private async handleChatMessage(msg: ClientToServerMessage & { type: ClientMessageType.CHAT_MESSAGE }, sender: Party.Connection) {
    const player = this.roomState.players.get(sender.id);
    if (!player) return;

    // Broadcast chat message
    this.broadcast({
      type: ServerMessageType.CHAT_BROADCAST,
      playerId: sender.id,
      playerName: player.name,
      message: msg.message,
      timestamp: Date.now(),
    });
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private startGame() {
    const blackPlayer = this.roomState.players.get(this.roomState.blackPlayerId!);
    const whitePlayer = this.roomState.players.get(this.roomState.whitePlayerId!);
    
    // Record game start time
    this.gameStartTime = new Date();
    this.moves = [];
    
    this.gameEngine = new GameEngine({
      boardSize: 19,
      komi: 6.5,
      gameType: 'online',
      players: {
        black: blackPlayer?.name || 'Black Player',
        white: whitePlayer?.name || 'White Player',
      },
    });
    this.roomState.gameState = this.gameEngine.getGameState();

    this.broadcast({
      type: ServerMessageType.GAME_STARTED,
      gameState: this.roomState.gameState,
      timestamp: Date.now(),
    });
  }

  private canAssignRole(role: PlayerRole): boolean {
    switch (role) {
      case PlayerRole.BLACK_PLAYER:
        return !this.roomState.blackPlayerId;
      case PlayerRole.WHITE_PLAYER:
        return !this.roomState.whitePlayerId;
      case PlayerRole.SPECTATOR:
        return true;
      default:
        return false;
    }
  }

  private assignRole(playerId: string, role: PlayerRole) {
    switch (role) {
      case PlayerRole.BLACK_PLAYER:
        this.roomState.blackPlayerId = playerId;
        break;
      case PlayerRole.WHITE_PLAYER:
        this.roomState.whitePlayerId = playerId;
        break;
    }
  }

  private isCurrentPlayer(playerId: string): boolean {
    const currentPlayer = this.roomState.gameState.currentPlayer;
    if (currentPlayer === Player.BLACK) {
      return playerId === this.roomState.blackPlayerId;
    } else {
      return playerId === this.roomState.whitePlayerId;
    }
  }

  private isPlayer(playerId: string): boolean {
    return playerId === this.roomState.blackPlayerId || 
           playerId === this.roomState.whitePlayerId;
  }

  private getPlayerBySender(senderId: string): Player | null {
    if (senderId === this.roomState.blackPlayerId) return Player.BLACK;
    if (senderId === this.roomState.whitePlayerId) return Player.WHITE;
    return null;
  }

  private sendRoomInfo(connection: Party.Connection) {
    this.send(connection, {
      type: ServerMessageType.ROOM_INFO,
      roomId: this.room.id,
      gameState: this.roomState.gameState,
      players: Array.from(this.roomState.players.values()),
      spectatorCount: this.roomState.spectators.size,
      timestamp: Date.now(),
    });
  }

  private send(connection: Party.Connection, message: ServerToClientMessage) {
    connection.send(JSON.stringify(message));
  }

  private broadcast(message: ServerToClientMessage, exclude?: string) {
    const msg = JSON.stringify(message);
    this.connections.forEach((conn, id) => {
      if (id !== exclude) {
        conn.send(msg);
      }
    });
  }

  private sendError(connection: Party.Connection, error: string, code?: string) {
    this.send(connection, {
      type: ServerMessageType.ERROR,
      error,
      code,
      timestamp: Date.now(),
    });
  }

  private async saveGameToBackend() {
    try {
      // Only save if we have both players and the game has ended
      if (!this.gameStartTime || 
          !this.roomState.blackPlayerId || 
          !this.roomState.whitePlayerId ||
          this.roomState.gameState.phase !== GamePhase.FINISHED) {
        return;
      }

      const blackPlayer = this.roomState.players.get(this.roomState.blackPlayerId);
      const whitePlayer = this.roomState.players.get(this.roomState.whitePlayerId);
      
      if (!blackPlayer || !whitePlayer) return;

      // Prepare game data
      const gameData = {
        roomId: this.room.id,
        players: {
          black: {
            id: this.roomState.blackPlayerId,
            name: blackPlayer.name
          },
          white: {
            id: this.roomState.whitePlayerId,
            name: whitePlayer.name
          }
        },
        gameState: this.roomState.gameState,
        moves: this.moves,
        result: {
          winner: (this.roomState.gameState as any).winner || null,
          scores: this.roomState.gameState.score,
          reason: (this.roomState.gameState as any).resignedPlayer ? 'resignation' : 'completion'
        },
        startedAt: this.gameStartTime,
        completedAt: new Date()
      };

      // Send to backend API
      const apiUrl = process.env.API_URL || 'http://localhost:8080/api';
      const webhookSecret = process.env.PARTYKIT_WEBHOOK_SECRET || 'default-secret';
      
      const response = await fetch(`${apiUrl}/game/webhook/partykit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': webhookSecret
        },
        body: JSON.stringify(gameData)
      });

      if (!response.ok) {
        console.error('[PartyKit] Failed to save game to backend:', await response.text());
      } else {
        console.log('[PartyKit] Game saved to backend successfully');
      }
    } catch (error) {
      console.error('[PartyKit] Error saving game to backend:', error);
    }
  }
}