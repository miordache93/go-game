import PartySocket from 'partysocket';
import { 
  ClientToServerMessage, 
  ServerToClientMessage,
  RoomInfoMessage,
  PublicRoomListResponse,
  PublicRoomInfo,
  ClientMessageType,
  ServerMessageType,
  PlayerRole,
  PlayerInfo
} from '@go-game/partykit-protocol';
import { GameState, Position, Player } from '@go-game/types';

export interface PartyKitClientConfig {
  roomId: string;
  playerName: string;
  clientId?: string;
  userId?: string;
  authToken?: string;
  isPrivate?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string, code?: string) => void;
  onRoomInfo?: (roomInfo: RoomInfoMessage) => void;
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

export function getPartyKitHost(): string {
  return process.env.NODE_ENV === 'production'
    ? 'go-game-server.partykit.dev'
    : 'localhost:1999';
}

const CLIENT_ID_STORAGE_PREFIX = 'go-game-partykit-client-id';

function createClientId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );
}

function getStableClientId(roomId: string): string {
  const storageKey = `${CLIENT_ID_STORAGE_PREFIX}:${roomId}`;

  if (typeof window === 'undefined') {
    return createClientId();
  }

  // Use sessionStorage, NOT localStorage: the client id is the player's
  // connection identity on the server. sessionStorage is scoped per browser
  // tab, so two tabs in the same browser become two distinct players (while a
  // reload within a tab still reconnects to the same seat). localStorage is
  // shared across tabs, which made both tabs join as the same player and left
  // the second seat unfilled — the game could never start.
  try {
    const existingClientId = window.sessionStorage.getItem(storageKey);
    if (existingClientId) {
      return existingClientId;
    }

    const clientId = createClientId();
    window.sessionStorage.setItem(storageKey, clientId);
    return clientId;
  } catch {
    return createClientId();
  }
}

export async function fetchAvailableRooms(): Promise<PublicRoomInfo[]> {
  const response = await PartySocket.fetch({
    host: getPartyKitHost(),
    room: 'lobby',
    path: 'rooms',
  });

  if (!response.ok) {
    throw new Error(`Unable to load rooms (${response.status})`);
  }

  const data = (await response.json()) as PublicRoomListResponse;
  return data.rooms;
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
    const host = getPartyKitHost();
    const clientId = this.config.clientId ?? getStableClientId(this.config.roomId);

    this.socket = new PartySocket({
      host,
      room: this.config.roomId,
      id: clientId,
    });

    this.socket.addEventListener('open', () => {
      this.isConnected = true;
      this.config.onConnect?.();

      // Send join message
      this.send({
        type: ClientMessageType.JOIN,
        playerInfo: {
          id: clientId,
          name: this.config.playerName,
          userId: this.config.userId,
        },
        authToken: this.config.authToken,
        roomConfig: {
          isPrivate: this.config.isPrivate,
        },
        timestamp: Date.now(),
      });
    });

    this.socket.addEventListener('close', () => {
      this.isConnected = false;
      this.config.onDisconnect?.();

      // Attempt to reconnect after 3 seconds
      this.reconnectTimeout = setTimeout(() => {
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
        this.config.onRoomInfo?.(message);
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
