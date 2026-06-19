import type * as Party from 'partykit/server';
import { GameEngine } from '@go-game/game';
import {
  type ClientToServerMessage,
  type ServerToClientMessage,
  type PlayerInfo,
  type RoomState,
  type PublicRoomInfo,
  type PublicRoomListResponse,
  ClientMessageType,
  ServerMessageType,
  PlayerRole,
  ErrorCode,
} from '@go-game/partykit-protocol';
import { Player, GamePhase, MoveType } from '@go-game/types';

// Input validation / abuse limits for untrusted client messages.
const MAX_CHAT_LENGTH = 500;
const MIN_CHAT_INTERVAL_MS = 500;
const MAX_NAME_LENGTH = 32;
const WAITING_ROOM_TIMEOUT_MS = 5 * 60 * 1000;
const ROOM_DIRECTORY_PATH = '/rooms';
const PENDING_BACKEND_SAVE_KEY = 'pending-backend-save';
const BACKEND_SAVE_RETRY_DELAYS_MS = [
  5_000,
  30_000,
  2 * 60_000,
  5 * 60_000,
  15 * 60_000,
];

const publicRoomDirectory = new Map<string, PublicRoomInfo>();

interface VerifiedAuthUser {
  id: string;
  username?: string;
}

interface BackendGameData {
  roomId: string;
  players: {
    black: { id: string; name: string; userId?: string };
    white: { id: string; name: string; userId?: string };
  };
  gameState: RoomState['gameState'];
  moves: unknown[];
  result: {
    winner: Player | null;
    scores?: {
      black: number;
      white: number;
    };
    reason: 'resignation' | 'completion';
  };
  startedAt: Date;
  completedAt: Date;
}

interface PendingBackendSave {
  gameData: BackendGameData;
  attempt: number;
  updatedAt: string;
}

function getApiBaseUrl(): string {
  return (process.env.API_URL || 'http://localhost:8080/api').replace(/\/$/, '');
}

function getBackendSaveRetryDelayMs(attempt: number): number {
  return BACKEND_SAVE_RETRY_DELAYS_MS[
    Math.min(Math.max(attempt - 1, 0), BACKEND_SAVE_RETRY_DELAYS_MS.length - 1)
  ];
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-store',
    },
  });
}

function cleanupExpiredPublicRooms(now = Date.now()) {
  publicRoomDirectory.forEach((room, roomId) => {
    if (Date.parse(room.waitingExpiresAt) <= now) {
      publicRoomDirectory.delete(roomId);
    }
  });
}

export default class GoGameServer implements Party.Server {
  private roomState: RoomState;
  private gameEngine: GameEngine;
  private connections: Map<string, Party.Connection> = new Map();
  private gameStartTime: Date | null = null;
  private moves: any[] = [];
  private lastChatAt: Map<string, number> = new Map();

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
      isPrivate: false,
      waitingStartedAt: null,
      waitingExpiresAt: null,
    };
  }

  async onStart() {
    await this.ensurePendingBackendSaveAlarm();
  }

  async onRequest(req: Party.Request) {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') {
      return jsonResponse(null, 204);
    }

    if (req.method === 'GET' && url.pathname.endsWith(ROOM_DIRECTORY_PATH)) {
      cleanupExpiredPublicRooms();
      const response: PublicRoomListResponse = {
        rooms: Array.from(publicRoomDirectory.values()).sort(
          (a, b) => Date.parse(b.lastActivity) - Date.parse(a.lastActivity)
        ),
        waitingTimeoutMs: WAITING_ROOM_TIMEOUT_MS,
        generatedAt: new Date().toISOString(),
      };

      return jsonResponse(response);
    }

    return new Response('Not found', { status: 404 });
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

  async onAlarm() {
    await this.retryPendingBackendSave();
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
    this.lastChatAt.delete(connection.id);
    this.roomState.lastActivity = new Date();
    this.syncPublicRoomDirectory();
  }

  // ==========================================
  // MESSAGE HANDLERS
  // ==========================================

  private async handleJoin(msg: ClientToServerMessage & { type: ClientMessageType.JOIN }, sender: Party.Connection) {
    const verifiedUser = await this.verifyAuthToken(msg.authToken);
    const requestedUserId = msg.playerInfo?.userId;

    if (msg.authToken && !verifiedUser) {
      this.sendError(sender, 'Invalid authentication token', ErrorCode.UNAUTHORIZED);
      return;
    }

    if (requestedUserId && !verifiedUser) {
      this.sendError(sender, 'Authentication required for user id', ErrorCode.UNAUTHORIZED);
      return;
    }

    if (requestedUserId && verifiedUser && requestedUserId !== verifiedUser.id) {
      this.sendError(sender, 'Authentication token does not match user id', ErrorCode.UNAUTHORIZED);
      return;
    }

    const isFirstJoin = this.roomState.players.size === 0;

    if (isFirstJoin) {
      const now = new Date();
      this.roomState.isPrivate = !!msg.roomConfig?.isPrivate;
      this.roomState.waitingStartedAt = now;
      this.roomState.waitingExpiresAt = new Date(now.getTime() + WAITING_ROOM_TIMEOUT_MS);
    }

    const rawName =
      typeof msg.playerInfo?.name === 'string' ? msg.playerInfo.name.trim() : '';
    const name = (rawName || 'Player').slice(0, MAX_NAME_LENGTH);
    const userId = verifiedUser?.id;

    const rejoinEntry = this.findRejoinCandidate(
      sender.id,
      userId
    );
    let playerInfo: PlayerInfo;

    if (rejoinEntry) {
      const [previousId, existingPlayer] = rejoinEntry;

      playerInfo = {
        ...existingPlayer,
        id: sender.id,
        name,
        isConnected: true,
        userId: userId ?? existingPlayer.userId,
      };

      if (previousId !== sender.id) {
        this.roomState.players.delete(previousId);
        this.replaceAssignedPlayerId(previousId, sender.id);
        this.roomState.spectators.delete(previousId);
        this.lastChatAt.delete(previousId);
      }
    } else {
      playerInfo = {
        id: sender.id,
        name,
        role: PlayerRole.SPECTATOR,
        isConnected: true,
        userId,
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
    }

    // Add to players
    this.roomState.players.set(sender.id, playerInfo);
    
    // Add to spectators if not a player
    if (playerInfo.role === PlayerRole.SPECTATOR) {
      this.roomState.spectators.add(sender.id);
    } else {
      this.roomState.spectators.delete(sender.id);
    }

    this.sendRoomInfo(sender);

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
        this.roomState.gameState.moveHistory.length === 0 &&
        this.gameStartTime === null) {
      this.startGame();
    } else {
      this.syncPublicRoomDirectory();
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
    this.syncPublicRoomDirectory();
    
    // Save game to backend
    await this.saveCompletedGameToBackend();
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
    this.syncPublicRoomDirectory();
    
    // Save game to backend
    await this.saveCompletedGameToBackend();
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

    // Validate and clamp message content.
    const raw = typeof msg.message === 'string' ? msg.message.trim() : '';
    if (!raw) return;
    const message = raw.slice(0, MAX_CHAT_LENGTH);

    // Basic per-connection rate limit to prevent chat spam/flooding.
    const now = Date.now();
    const last = this.lastChatAt.get(sender.id) ?? 0;
    if (now - last < MIN_CHAT_INTERVAL_MS) {
      return;
    }
    this.lastChatAt.set(sender.id, now);

    // Broadcast chat message
    this.broadcast({
      type: ServerMessageType.CHAT_BROADCAST,
      playerId: sender.id,
      playerName: player.name,
      message,
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
    this.syncPublicRoomDirectory();
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

  private findRejoinCandidate(
    connectionId: string,
    userId?: string
  ): readonly [string, PlayerInfo] | null {
    const existingConnectionPlayer = this.roomState.players.get(connectionId);
    if (existingConnectionPlayer) {
      return [connectionId, existingConnectionPlayer];
    }

    if (!userId) {
      return null;
    }

    for (const [playerId, player] of this.roomState.players) {
      if (
        player.userId === userId &&
        !player.isConnected &&
        player.role !== PlayerRole.SPECTATOR
      ) {
        return [playerId, player];
      }
    }

    return null;
  }

  private replaceAssignedPlayerId(previousId: string, nextId: string) {
    if (this.roomState.blackPlayerId === previousId) {
      this.roomState.blackPlayerId = nextId;
    }

    if (this.roomState.whitePlayerId === previousId) {
      this.roomState.whitePlayerId = nextId;
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
      isPrivate: this.roomState.isPrivate,
      waitingExpiresAt: this.roomState.waitingExpiresAt?.toISOString(),
      timestamp: Date.now(),
    });
  }

  private syncPublicRoomDirectory() {
    if (this.room.id === 'lobby') {
      return;
    }

    cleanupExpiredPublicRooms();

    const now = Date.now();
    const waitingExpiresAt = this.roomState.waitingExpiresAt;
    const activePlayers = Array.from(this.roomState.players.values()).filter(
      (player) => player.isConnected && player.role !== PlayerRole.SPECTATOR
    );
    const isWaitingForOpponent =
      activePlayers.length === 1 &&
      this.roomState.gameState.phase === GamePhase.PLAYING &&
      this.roomState.gameState.moveHistory.length === 0;
    const isExpired = waitingExpiresAt
      ? waitingExpiresAt.getTime() <= now
      : true;

    if (this.roomState.isPrivate || !isWaitingForOpponent || isExpired || !waitingExpiresAt) {
      publicRoomDirectory.delete(this.room.id);
      return;
    }

    publicRoomDirectory.set(this.room.id, {
      id: this.room.id,
      playerNames: activePlayers.map((player) => player.name),
      playerCount: activePlayers.length,
      spectatorCount: this.roomState.spectators.size,
      createdAt: this.roomState.createdAt.toISOString(),
      waitingExpiresAt: waitingExpiresAt.toISOString(),
      lastActivity: this.roomState.lastActivity.toISOString(),
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

  private async verifyAuthToken(authToken?: string): Promise<VerifiedAuthUser | null> {
    const token = typeof authToken === 'string' ? authToken.trim() : '';
    if (!token) {
      return null;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as {
        data?: {
          user?: {
            id?: unknown;
            _id?: unknown;
            username?: unknown;
          };
        };
      };
      const user = payload.data?.user;
      const id =
        typeof user?.id === 'string'
          ? user.id
          : typeof user?._id === 'string'
            ? user._id
            : null;

      if (!id) {
        return null;
      }

      return {
        id,
        username: typeof user?.username === 'string' ? user.username : undefined,
      };
    } catch (error) {
      console.error(`[${this.room.id}] Failed to verify auth token:`, error);
      return null;
    }
  }

  private async saveCompletedGameToBackend() {
    const gameData = this.buildCompletedGamePayload();

    if (!gameData) {
      return;
    }

    const saveResult = await this.sendGameToBackend(gameData);

    if (saveResult) {
      await this.clearPendingBackendSave();
      return;
    }

    await this.queueBackendSaveRetry(gameData, 1);
    this.broadcastBackendSaveFailure();
  }

  private buildCompletedGamePayload(): BackendGameData | null {
    if (
      !this.gameStartTime ||
      !this.roomState.blackPlayerId ||
      !this.roomState.whitePlayerId ||
      this.roomState.gameState.phase !== GamePhase.FINISHED
    ) {
      return null;
    }

    const blackPlayer = this.roomState.players.get(this.roomState.blackPlayerId);
    const whitePlayer = this.roomState.players.get(this.roomState.whitePlayerId);

    if (!blackPlayer || !whitePlayer) return null;

    const finalScore = this.roomState.gameState.score;
    const resultReason =
      this.roomState.gameState.lastMove?.type === MoveType.RESIGN
        ? 'resignation'
        : 'completion';

    return {
      roomId: this.room.id,
      players: {
        black: {
          id: this.roomState.blackPlayerId,
          name: blackPlayer.name,
          userId: blackPlayer.userId,
        },
        white: {
          id: this.roomState.whitePlayerId,
          name: whitePlayer.name,
          userId: whitePlayer.userId,
        },
      },
      gameState: this.roomState.gameState,
      moves: this.moves,
      result: {
        winner: finalScore?.winner ?? null,
        scores: finalScore
          ? {
              black: finalScore.black.total,
              white: finalScore.white.total,
            }
          : undefined,
        reason: resultReason,
      },
      startedAt: this.gameStartTime,
      completedAt: new Date(),
    };
  }

  private async sendGameToBackend(gameData: BackendGameData): Promise<boolean> {
    try {
      // Send to backend API. The webhook secret must match the API's
      // (config.partykitWebhookSecret); the dev fallback is shared here.
      const webhookSecret =
        process.env.PARTYKIT_WEBHOOK_SECRET || 'dev-partykit-webhook-secret';
      
      const response = await fetch(`${getApiBaseUrl()}/game/webhook/partykit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': webhookSecret
        },
        body: JSON.stringify(gameData)
      });

      if (!response.ok) {
        console.error('[PartyKit] Failed to save game to backend:', await response.text());
        return false;
      } else {
        console.log('[PartyKit] Game saved to backend successfully');
        return true;
      }
    } catch (error) {
      console.error('[PartyKit] Error saving game to backend:', error);
      return false;
    }
  }

  private async retryPendingBackendSave() {
    const pending = await this.room.storage.get<PendingBackendSave>(
      PENDING_BACKEND_SAVE_KEY
    );

    if (!pending) {
      return;
    }

    const saveResult = await this.sendGameToBackend(pending.gameData);

    if (saveResult) {
      await this.clearPendingBackendSave();
      return;
    }

    await this.queueBackendSaveRetry(
      pending.gameData,
      pending.attempt + 1
    );
  }

  private async queueBackendSaveRetry(
    gameData: BackendGameData,
    attempt: number
  ) {
    const retryAt = Date.now() + getBackendSaveRetryDelayMs(attempt);

    await this.room.storage.put<PendingBackendSave>(PENDING_BACKEND_SAVE_KEY, {
      gameData,
      attempt,
      updatedAt: new Date().toISOString(),
    });
    await this.room.storage.setAlarm(retryAt);
  }

  private async clearPendingBackendSave() {
    await this.room.storage.delete(PENDING_BACKEND_SAVE_KEY);
    await this.room.storage.deleteAlarm();
  }

  private async ensurePendingBackendSaveAlarm() {
    const pending = await this.room.storage.get<PendingBackendSave>(
      PENDING_BACKEND_SAVE_KEY
    );

    if (!pending) {
      return;
    }

    const alarm = await this.room.storage.getAlarm();
    if (alarm === null) {
      await this.room.storage.setAlarm(
        Date.now() + getBackendSaveRetryDelayMs(pending.attempt + 1)
      );
    }
  }

  private broadcastBackendSaveFailure() {
    this.broadcast({
      type: ServerMessageType.ERROR,
      error:
        'Game completed, but saving the result failed. The result may not appear in history yet.',
      code: ErrorCode.BACKEND_SAVE_FAILED,
      timestamp: Date.now(),
    });
  }
}
