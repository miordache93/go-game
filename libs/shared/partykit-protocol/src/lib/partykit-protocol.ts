/**
 * PartyKit Protocol Types and Messages
 * 
 * This file defines all the message types and protocols used for
 * real-time multiplayer communication in the Go Game.
 */

import type { 
  GameState, 
  Move, 
  Position, 
} from '@go-game/types';

import { Player } from '@go-game/types';

// ==========================================
// PLAYER ROLES & CONNECTION TYPES
// ==========================================

export enum PlayerRole {
  BLACK_PLAYER = 'black_player',
  WHITE_PLAYER = 'white_player',
  SPECTATOR = 'spectator',
}

export interface PlayerInfo {
  id: string;
  name: string;
  role: PlayerRole;
  isConnected: boolean;
  userId?: string; // Backend user ID if authenticated
}

// ==========================================
// MESSAGE TYPES - CLIENT TO SERVER
// ==========================================

export enum ClientMessageType {
  // Connection
  JOIN = 'join',
  LEAVE = 'leave',
  
  // Game Actions
  MAKE_MOVE = 'make_move',
  PASS = 'pass',
  RESIGN = 'resign',
  
  // Scoring Phase
  MARK_DEAD = 'mark_dead',
  FINALIZE_GAME = 'finalize_game',
  RESUME_PLAYING = 'resume_playing',
  
  // Chat
  CHAT_MESSAGE = 'chat_message',
  
  // Game Control
  REQUEST_UNDO = 'request_undo',
  ACCEPT_UNDO = 'accept_undo',
  REJECT_UNDO = 'reject_undo',
}

export interface ClientMessage {
  type: ClientMessageType;
  timestamp: number;
}

export interface JoinMessage extends ClientMessage {
  type: ClientMessageType.JOIN;
  playerInfo: {
    id: string;
    name: string;
    userId?: string;
  };
  requestedRole?: PlayerRole;
  authToken?: string;
}

export interface MakeMoveMessage extends ClientMessage {
  type: ClientMessageType.MAKE_MOVE;
  position: Position;
}

export interface PassMessage extends ClientMessage {
  type: ClientMessageType.PASS;
}

export interface ResignMessage extends ClientMessage {
  type: ClientMessageType.RESIGN;
}

export interface MarkDeadMessage extends ClientMessage {
  type: ClientMessageType.MARK_DEAD;
  position: Position;
}

export interface FinalizeGameMessage extends ClientMessage {
  type: ClientMessageType.FINALIZE_GAME;
}

export interface ResumePlayingMessage extends ClientMessage {
  type: ClientMessageType.RESUME_PLAYING;
}

export interface ChatMessage extends ClientMessage {
  type: ClientMessageType.CHAT_MESSAGE;
  message: string;
}

export interface RequestUndoMessage extends ClientMessage {
  type: ClientMessageType.REQUEST_UNDO;
}

export interface AcceptUndoMessage extends ClientMessage {
  type: ClientMessageType.ACCEPT_UNDO;
}

export interface RejectUndoMessage extends ClientMessage {
  type: ClientMessageType.REJECT_UNDO;
}

export type ClientToServerMessage = 
  | JoinMessage
  | MakeMoveMessage
  | PassMessage
  | ResignMessage
  | MarkDeadMessage
  | FinalizeGameMessage
  | ResumePlayingMessage
  | ChatMessage
  | RequestUndoMessage
  | AcceptUndoMessage
  | RejectUndoMessage;

// ==========================================
// MESSAGE TYPES - SERVER TO CLIENT
// ==========================================

export enum ServerMessageType {
  // Connection
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  ROLE_ASSIGNED = 'role_assigned',
  
  // Game State
  GAME_STATE_UPDATE = 'game_state_update',
  MOVE_MADE = 'move_made',
  INVALID_MOVE = 'invalid_move',
  
  // Game Events
  GAME_STARTED = 'game_started',
  GAME_ENDED = 'game_ended',
  GAME_PAUSED = 'game_paused',
  GAME_RESUMED = 'game_resumed',
  
  // Scoring
  SCORING_STARTED = 'scoring_started',
  DEAD_STONES_MARKED = 'dead_stones_marked',
  GAME_FINALIZED = 'game_finalized',
  
  // Chat
  CHAT_BROADCAST = 'chat_broadcast',
  
  // Game Control
  UNDO_REQUESTED = 'undo_requested',
  UNDO_ACCEPTED = 'undo_accepted',
  UNDO_REJECTED = 'undo_rejected',
  
  // Errors
  ERROR = 'error',
  
  // Room Info
  ROOM_INFO = 'room_info',
}

export interface ServerMessage {
  type: ServerMessageType;
  timestamp: number;
}

export interface PlayerJoinedMessage extends ServerMessage {
  type: ServerMessageType.PLAYER_JOINED;
  player: PlayerInfo;
}

export interface PlayerLeftMessage extends ServerMessage {
  type: ServerMessageType.PLAYER_LEFT;
  playerId: string;
}

export interface RoleAssignedMessage extends ServerMessage {
  type: ServerMessageType.ROLE_ASSIGNED;
  role: PlayerRole;
  playerId: string;
}

export interface GameStateUpdateMessage extends ServerMessage {
  type: ServerMessageType.GAME_STATE_UPDATE;
  gameState: GameState;
  players: PlayerInfo[];
}

export interface MoveMadeMessage extends ServerMessage {
  type: ServerMessageType.MOVE_MADE;
  move: Move;
  gameState: GameState;
  capturedStones?: Position[];
}

export interface InvalidMoveMessage extends ServerMessage {
  type: ServerMessageType.INVALID_MOVE;
  reason: string;
  position?: Position;
}

export interface GameStartedMessage extends ServerMessage {
  type: ServerMessageType.GAME_STARTED;
  gameState: GameState;
}

export interface GameEndedMessage extends ServerMessage {
  type: ServerMessageType.GAME_ENDED;
  winner: Player | null;
  reason: 'resignation' | 'timeout' | 'completion';
  finalScore?: GameState['score'];
}

export interface GamePausedMessage extends ServerMessage {
  type: ServerMessageType.GAME_PAUSED;
}

export interface GameResumedMessage extends ServerMessage {
  type: ServerMessageType.GAME_RESUMED;
}

export interface ScoringStartedMessage extends ServerMessage {
  type: ServerMessageType.SCORING_STARTED;
}

export interface DeadStonesMarkedMessage extends ServerMessage {
  type: ServerMessageType.DEAD_STONES_MARKED;
  deadStones: string[]; // Position as "x,y" strings
  gameState: GameState;
}

export interface GameFinalizedMessage extends ServerMessage {
  type: ServerMessageType.GAME_FINALIZED;
  gameState: GameState;
  finalScore: GameState['score'];
}

export interface ChatBroadcastMessage extends ServerMessage {
  type: ServerMessageType.CHAT_BROADCAST;
  playerId: string;
  playerName: string;
  message: string;
}

export interface UndoRequestedMessage extends ServerMessage {
  type: ServerMessageType.UNDO_REQUESTED;
  requestedBy: string;
  moveToUndo: Move;
}

export interface ErrorMessage extends ServerMessage {
  type: ServerMessageType.ERROR;
  error: string;
  code?: string;
}

export interface RoomInfoMessage extends ServerMessage {
  type: ServerMessageType.ROOM_INFO;
  roomId: string;
  gameState: GameState;
  players: PlayerInfo[];
  spectatorCount: number;
}

export type ServerToClientMessage = 
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | RoleAssignedMessage
  | GameStateUpdateMessage
  | MoveMadeMessage
  | InvalidMoveMessage
  | GameStartedMessage
  | GameEndedMessage
  | GamePausedMessage
  | GameResumedMessage
  | ScoringStartedMessage
  | DeadStonesMarkedMessage
  | GameFinalizedMessage
  | ChatBroadcastMessage
  | UndoRequestedMessage
  | ErrorMessage
  | RoomInfoMessage;

// ==========================================
// ROOM STATE & CONFIGURATION
// ==========================================

export interface RoomState {
  id: string;
  gameState: GameState;
  players: Map<string, PlayerInfo>;
  blackPlayerId: string | null;
  whitePlayerId: string | null;
  spectators: Set<string>;
  undoRequest: {
    requestedBy: string;
    moveToUndo: Move;
    acceptedBy: Set<string>;
  } | null;
  createdAt: Date;
  lastActivity: Date;
}

export interface RoomConfig {
  maxSpectators?: number;
  allowUndo?: boolean;
  allowChat?: boolean;
  inactivityTimeout?: number; // Minutes before room closes
  requireAuth?: boolean;
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

export function createRoomId(): string {
  return `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function serializePosition(position: Position): string {
  return `${position.x},${position.y}`;
}

export function deserializePosition(str: string): Position {
  const [x, y] = str.split(',').map(Number);
  return { x, y };
}

export function isPlayerRole(role: PlayerRole): role is PlayerRole.BLACK_PLAYER | PlayerRole.WHITE_PLAYER {
  return role === PlayerRole.BLACK_PLAYER || role === PlayerRole.WHITE_PLAYER;
}

export function getPlayerFromRole(role: PlayerRole): Player | null {
  switch (role) {
    case PlayerRole.BLACK_PLAYER:
      return Player.BLACK;
    case PlayerRole.WHITE_PLAYER:
      return Player.WHITE;
    default:
      return null;
  }
}

export function getRoleFromPlayer(player: Player): PlayerRole {
  return player === Player.BLACK ? PlayerRole.BLACK_PLAYER : PlayerRole.WHITE_PLAYER;
}

// ==========================================
// ERROR CODES
// ==========================================

export enum ErrorCode {
  ROOM_FULL = 'ROOM_FULL',
  ROLE_TAKEN = 'ROLE_TAKEN',
  NOT_YOUR_TURN = 'NOT_YOUR_TURN',
  INVALID_MOVE = 'INVALID_MOVE',
  GAME_NOT_STARTED = 'GAME_NOT_STARTED',
  GAME_ALREADY_ENDED = 'GAME_ALREADY_ENDED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_MESSAGE = 'INVALID_MESSAGE',
}