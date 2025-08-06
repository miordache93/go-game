import PartySocket from 'partysocket';
import { 
  ClientToServerMessage, 
  ServerToClientMessage,
  ClientMessageType,
  ServerMessageType,
  PlayerRole,
  PlayerInfo
} from '@go-game/partykit-protocol';
import { GameState, Position, Player } from '@go-game/types';

export interface PartyKitClientConfig {
  roomId: string;
  playerName: string;
  userId?: string;
  authToken?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string, code?: string) => void;
  onGameStateUpdate?: (gameState: GameState, players: PlayerInfo[]) => void;
  onMoveMade?: (move: any, gameState: GameState, capturedStones?: Position[]) => void;
  onInvalidMove?: (reason: string, position?: Position) => void;
  onRoleAssigned?: (role: PlayerRole, playerId: string) => void;
  onPlayerJoined?: (player: PlayerInfo) => void;
  onPlayerLeft?: (playerId: string) => void;
  onGameStarted?: (gameState: GameState) => void;
  onGameEnded?: (winner: Player | null, reason: string, finalScore?: any) => void;
  onScoringStarted?: () => void;
  onDeadStonesMarked?: (deadStones: string[], gameState: GameState) => void;
  onGameFinalized?: (gameState: GameState, finalScore: any) => void;
  onChatMessage?: (playerId: string, playerName: string, message: string) => void;
}

export class PartyKitClient {
  private socket: PartySocket | null = null;
  private config: PartyKitClientConfig;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnected = false;

  constructor(config: PartyKitClientConfig) {
    this.config = config;
  }

  connect(): void {
    const host = process.env.NODE_ENV === 'production' 
      ? 'go-game-server.partykit.dev'
      : 'localhost:1999';

    this.socket = new PartySocket({
      host,
      room: this.config.roomId,
      id: this.config.playerName,
    });

    this.socket.addEventListener('open', () => {
      console.log('✅ Connected to PartyKit server');
      this.isConnected = true;
      this.config.onConnect?.();

      // Send join message
      this.send({
        type: ClientMessageType.JOIN,
        playerInfo: {
          id: this.config.playerName,
          name: this.config.playerName,
          userId: this.config.userId,
        },
        authToken: this.config.authToken,
        timestamp: Date.now(),
      });
    });

    this.socket.addEventListener('close', () => {
      console.log('❌ Disconnected from PartyKit server');
      this.isConnected = false;
      this.config.onDisconnect?.();

      // Attempt to reconnect after 3 seconds
      this.reconnectTimeout = setTimeout(() => {
        console.log('🔄 Attempting to reconnect...');
        this.connect();
      }, 3000);
    });

    this.socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data) as ServerToClientMessage;
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    });

    this.socket.addEventListener('error', (event) => {
      console.error('WebSocket error:', event);
      this.config.onError?.('Connection error');
    });
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  private send(message: ClientToServerMessage): void {
    if (this.socket && this.isConnected) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('Cannot send message: not connected');
    }
  }

  private handleMessage(message: ServerToClientMessage): void {
    console.log('📨 Received message:', message.type);

    switch (message.type) {
      case ServerMessageType.ROLE_ASSIGNED:
        this.config.onRoleAssigned?.(message.role, message.playerId);
        break;

      case ServerMessageType.GAME_STATE_UPDATE:
        this.config.onGameStateUpdate?.(message.gameState, message.players);
        break;

      case ServerMessageType.MOVE_MADE:
        this.config.onMoveMade?.(message.move, message.gameState, message.capturedStones);
        break;

      case ServerMessageType.INVALID_MOVE:
        this.config.onInvalidMove?.(message.reason, message.position);
        break;

      case ServerMessageType.PLAYER_JOINED:
        this.config.onPlayerJoined?.(message.player);
        break;

      case ServerMessageType.PLAYER_LEFT:
        this.config.onPlayerLeft?.(message.playerId);
        break;

      case ServerMessageType.GAME_STARTED:
        this.config.onGameStarted?.(message.gameState);
        break;

      case ServerMessageType.GAME_ENDED:
        this.config.onGameEnded?.(message.winner, message.reason, message.finalScore);
        break;

      case ServerMessageType.SCORING_STARTED:
        this.config.onScoringStarted?.();
        break;

      case ServerMessageType.DEAD_STONES_MARKED:
        this.config.onDeadStonesMarked?.(message.deadStones, message.gameState);
        break;

      case ServerMessageType.GAME_FINALIZED:
        this.config.onGameFinalized?.(message.gameState, message.finalScore);
        break;

      case ServerMessageType.CHAT_BROADCAST:
        this.config.onChatMessage?.(message.playerId, message.playerName, message.message);
        break;

      case ServerMessageType.ERROR:
        this.config.onError?.(message.error, message.code);
        break;

      case ServerMessageType.ROOM_INFO:
        // Initial room info, update game state
        this.config.onGameStateUpdate?.(message.gameState, message.players);
        break;
    }
  }

  // Public methods for game actions
  makeMove(position: Position): void {
    this.send({
      type: ClientMessageType.MAKE_MOVE,
      position,
      timestamp: Date.now(),
    });
  }

  pass(): void {
    this.send({
      type: ClientMessageType.PASS,
      timestamp: Date.now(),
    });
  }

  resign(): void {
    this.send({
      type: ClientMessageType.RESIGN,
      timestamp: Date.now(),
    });
  }

  markDead(position: Position): void {
    this.send({
      type: ClientMessageType.MARK_DEAD,
      position,
      timestamp: Date.now(),
    });
  }

  finalizeGame(): void {
    this.send({
      type: ClientMessageType.FINALIZE_GAME,
      timestamp: Date.now(),
    });
  }

  resumePlaying(): void {
    this.send({
      type: ClientMessageType.RESUME_PLAYING,
      timestamp: Date.now(),
    });
  }

  sendChatMessage(message: string): void {
    this.send({
      type: ClientMessageType.CHAT_MESSAGE,
      message,
      timestamp: Date.now(),
    });
  }

  requestUndo(): void {
    this.send({
      type: ClientMessageType.REQUEST_UNDO,
      timestamp: Date.now(),
    });
  }

  acceptUndo(): void {
    this.send({
      type: ClientMessageType.ACCEPT_UNDO,
      timestamp: Date.now(),
    });
  }

  rejectUndo(): void {
    this.send({
      type: ClientMessageType.REJECT_UNDO,
      timestamp: Date.now(),
    });
  }

  isConnectedToServer(): boolean {
    return this.isConnected;
  }
}