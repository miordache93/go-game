/**
 * Core GO Game Types and Interfaces
 *
 * This file contains all the fundamental types used throughout the GO game application.
 * These types define the game state, board representation, moves, and player interactions.
 */

// ==========================================
// BASIC GAME TYPES
// ==========================================

/**
 * Represents the two players in a GO game
 */
export enum Player {
  BLACK = 'black',
  WHITE = 'white',
}

/**
 * The current phase of the game
 */
export enum GamePhase {
  SETUP = 'setup', // Game being set up
  PLAYING = 'playing', // Active gameplay
  SCORING = 'scoring', // Territory marking phase
  FINISHED = 'finished', // Game completed
}

/**
 * Standard board sizes for GO
 */
export enum BoardSize {
  SMALL = 9, // 9x9 beginner board
  MEDIUM = 13, // 13x13 intermediate board
  LARGE = 19, // 19x19 professional board
}

/**
 * Types of moves a player can make
 */
export enum MoveType {
  PLACE_STONE = 'place_stone',
  PASS = 'pass',
  RESIGN = 'resign',
}

// ==========================================
// BOARD & POSITION TYPES
// ==========================================

/**
 * Represents a position on the GO board
 * Uses 0-based indexing: (0,0) is top-left corner
 */
export interface Position {
  readonly x: number;
  readonly y: number;
}

/**
 * Represents a stone placed on the board
 */
export interface Stone {
  readonly position: Position;
  readonly player: Player;
  readonly moveNumber: number; // When this stone was placed
}

/**
 * Represents the state of a single intersection on the board
 */
export type Intersection = Stone | null;

/**
 * Represents the entire board state as a 2D array
 * board[y][x] gives the intersection at position (x, y)
 */
export type Board = Intersection[][];

/**
 * A group of connected stones of the same color
 */
export interface StoneGroup {
  readonly stones: Set<Position>;
  readonly player: Player;
  readonly liberties: Set<Position>; // Empty intersections adjacent to this group
}

// ==========================================
// MOVE & GAME ACTION TYPES
// ==========================================

/**
 * Represents a move made by a player
 */
export interface Move {
  readonly id: string;
  readonly player: Player;
  readonly type: MoveType;
  readonly position?: Position; // undefined for pass/resign
  readonly timestamp: Date;
  readonly moveNumber: number;
}

/**
 * Result of attempting to make a move
 */
export interface MoveResult {
  readonly success: boolean;
  readonly move?: Move;
  readonly capturedStones?: Position[];
  readonly error?: string;
  readonly newGameState?: GameState;
}

/**
 * Represents the result of a capture
 */
export interface CaptureResult {
  readonly capturedGroups: StoneGroup[];
  readonly capturedStones: Position[];
  readonly capturedBy: Player;
}

// ==========================================
// GAME STATE TYPES
// ==========================================

/**
 * Scoring information for territory counting
 */
export interface Territory {
  readonly positions: Set<Position>;
  readonly controlledBy: Player | null; // null = neutral/contested
  readonly points: number;
}

/**
 * Final game score
 */
export interface GameScore {
  readonly black: {
    readonly territory: number;
    readonly captures: number;
    readonly total: number;
  };
  readonly white: {
    readonly territory: number;
    readonly captures: number;
    readonly komi: number; // Compensation points for white
    readonly total: number;
  };
  readonly winner: Player | null; // null = tie
}

/**
 * Complete game state
 * This is the single source of truth for the entire game
 */
export interface GameState {
  readonly id: string;
  readonly board: Board;
  readonly boardSize: BoardSize;
  readonly currentPlayer: Player;
  readonly phase: GamePhase;
  readonly moveHistory: Move[];
  readonly capturedStones: {
    readonly [Player.BLACK]: Position[];
    readonly [Player.WHITE]: Position[];
  };
  readonly koPosition: Position | null; // Position that cannot be played due to Ko rule
  readonly passCount: number; // Consecutive passes (2 = end game)
  readonly score: GameScore | null; // null until game is scored
  readonly komi: number; // Points given to white player
  readonly timeSettings?: TimeSettings;
  readonly lastMove?: Move;
}

/**
 * Time control settings for the game
 */
export interface TimeSettings {
  readonly mainTime: number; // Main time in seconds
  readonly byoyomi?: number; // Overtime periods in seconds
  readonly periods?: number; // Number of overtime periods
}

// ==========================================
// GAME CREATION & MANAGEMENT TYPES
// ==========================================

/**
 * Settings used to create a new game
 */
export interface GameSettings {
  readonly boardSize: BoardSize;
  readonly komi: number;
  readonly timeSettings?: TimeSettings;
  readonly gameType: 'local' | 'online';
  readonly players: {
    readonly black: string; // Player name/ID
    readonly white: string; // Player name/ID
  };
}

/**
 * Historical game record for replay/analysis
 */
export interface GameRecord {
  readonly gameState: GameState;
  readonly metadata: {
    readonly startTime: Date;
    readonly endTime?: Date;
    readonly duration?: number; // Game duration in seconds
    readonly result: string; // "B+R", "W+7.5", etc.
  };
}

// ==========================================
// UTILITY TYPES
// ==========================================

/**
 * Direction vectors for adjacent positions
 */
export interface Direction {
  readonly dx: number;
  readonly dy: number;
}

/**
 * Common direction constants
 */
export const DIRECTIONS: readonly Direction[] = [
  { dx: 0, dy: -1 }, // North
  { dx: 1, dy: 0 }, // East
  { dx: 0, dy: 1 }, // South
  { dx: -1, dy: 0 }, // West
] as const;

/**
 * Type guard to check if a position is valid for a given board size
 */
export const isValidPosition = (
  position: Position,
  boardSize: BoardSize
): boolean => {
  return (
    position.x >= 0 &&
    position.x < boardSize &&
    position.y >= 0 &&
    position.y < boardSize
  );
};

/**
 * Helper to create a position
 */
export const createPosition = (x: number, y: number): Position => ({ x, y });

/**
 * Helper to compare positions for equality
 */
export const positionsEqual = (a: Position, b: Position): boolean => {
  return a.x === b.x && a.y === b.y;
};

/**
 * Helper to get opposite player
 */
export const getOpponent = (player: Player): Player => {
  return player === Player.BLACK ? Player.WHITE : Player.BLACK;
};
