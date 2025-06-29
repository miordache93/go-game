/**
 * GO Game Constants
 *
 * This file contains all the constant values used throughout the GO game.
 * These constants define board sizes, scoring rules, colors, and other fixed values.
 */

import { BoardSize } from '@go-game/types';

// ==========================================
// BOARD CONSTANTS
// ==========================================

/**
 * Available board sizes with their dimensions
 */
export const BOARD_SIZES = {
  [BoardSize.SMALL]: { size: 9, name: 'Small (9×9)', recommended: 'Beginner' },
  [BoardSize.MEDIUM]: {
    size: 13,
    name: 'Medium (13×13)',
    recommended: 'Intermediate',
  },
  [BoardSize.LARGE]: {
    size: 19,
    name: 'Large (19×19)',
    recommended: 'Advanced',
  },
} as const;

/**
 * Star points (handicap points) for different board sizes
 * These are the special intersections marked on GO boards
 */
export const STAR_POINTS = {
  [BoardSize.SMALL]: [
    { x: 2, y: 2 },
    { x: 6, y: 2 },
    { x: 2, y: 6 },
    { x: 6, y: 6 },
    { x: 4, y: 4 }, // Center point
  ],
  [BoardSize.MEDIUM]: [
    { x: 3, y: 3 },
    { x: 9, y: 3 },
    { x: 3, y: 9 },
    { x: 9, y: 9 },
    { x: 6, y: 6 }, // Center point
  ],
  [BoardSize.LARGE]: [
    { x: 3, y: 3 },
    { x: 9, y: 3 },
    { x: 15, y: 3 },
    { x: 3, y: 9 },
    { x: 9, y: 9 },
    { x: 15, y: 9 },
    { x: 3, y: 15 },
    { x: 9, y: 15 },
    { x: 15, y: 15 },
  ],
} as const;

// ==========================================
// SCORING CONSTANTS
// ==========================================

/**
 * Standard komi (compensation points for white) by board size
 */
export const DEFAULT_KOMI = {
  [BoardSize.SMALL]: 5.5,
  [BoardSize.MEDIUM]: 6.5,
  [BoardSize.LARGE]: 7.5,
} as const;

/**
 * Common komi values that can be selected
 */
export const KOMI_OPTIONS = [0, 0.5, 5.5, 6.5, 7.5, 8.5] as const;

/**
 * Maximum number of consecutive passes before game ends
 */
export const MAX_CONSECUTIVE_PASSES = 2;

/**
 * Points awarded for capturing stones
 */
export const CAPTURE_POINTS = 1;

// ==========================================
// TIME CONTROL CONSTANTS
// ==========================================

/**
 * Common time control presets (in seconds)
 */
export const TIME_CONTROLS = {
  BLITZ: {
    name: 'Blitz',
    mainTime: 300, // 5 minutes
    byoyomi: 10, // 10 seconds per move
    periods: 3, // 3 overtime periods
    description: 'Fast-paced games',
  },
  RAPID: {
    name: 'Rapid',
    mainTime: 900, // 15 minutes
    byoyomi: 30, // 30 seconds per move
    periods: 5, // 5 overtime periods
    description: 'Standard online games',
  },
  NORMAL: {
    name: 'Normal',
    mainTime: 1800, // 30 minutes
    byoyomi: 60, // 1 minute per move
    periods: 5, // 5 overtime periods
    description: 'Relaxed games',
  },
  CORRESPONDENCE: {
    name: 'Correspondence',
    mainTime: 259200, // 3 days (in seconds)
    description: 'Long-term games',
  },
} as const;

// ==========================================
// VISUAL CONSTANTS
// ==========================================

/**
 * Player colors for styling
 */
export const PLAYER_COLORS = {
  BLACK: {
    primary: '#1a1a1a',
    secondary: '#333333',
    accent: '#000000',
    name: 'Black',
  },
  WHITE: {
    primary: '#ffffff',
    secondary: '#f5f5f5',
    accent: '#e0e0e0',
    name: 'White',
  },
} as const;

/**
 * Board theme colors
 */
export const BOARD_THEMES = {
  CLASSIC: {
    name: 'Classic',
    board: '#DEB887', // Burlywood
    lines: '#8B4513', // Saddle brown
    starPoints: '#654321', // Dark brown
    background: '#F5E6D3', // Light beige
  },
  MODERN: {
    name: 'Modern',
    board: '#2C3E50', // Dark blue-gray
    lines: '#34495E', // Lighter blue-gray
    starPoints: '#1ABC9C', // Turquoise
    background: '#ECF0F1', // Light gray
  },
  ZEN: {
    name: 'Zen',
    board: '#8B7355', // Dark khaki
    lines: '#654321', // Dark brown
    starPoints: '#2F4F4F', // Dark slate gray
    background: '#F5F5DC', // Beige
  },
} as const;

// ==========================================
// GAME RULES CONSTANTS
// ==========================================

/**
 * Minimum and maximum number of handicap stones
 */
export const HANDICAP_RANGE = {
  MIN: 2,
  MAX: 9,
} as const;

/**
 * Default handicap stone positions for 19x19 board
 */
export const HANDICAP_POSITIONS_19 = {
  2: [
    { x: 3, y: 15 },
    { x: 15, y: 3 },
  ],
  3: [
    { x: 3, y: 15 },
    { x: 15, y: 3 },
    { x: 15, y: 15 },
  ],
  4: [
    { x: 3, y: 3 },
    { x: 15, y: 3 },
    { x: 3, y: 15 },
    { x: 15, y: 15 },
  ],
  5: [
    { x: 3, y: 3 },
    { x: 15, y: 3 },
    { x: 3, y: 15 },
    { x: 15, y: 15 },
    { x: 9, y: 9 },
  ],
  6: [
    { x: 3, y: 3 },
    { x: 15, y: 3 },
    { x: 3, y: 9 },
    { x: 15, y: 9 },
    { x: 3, y: 15 },
    { x: 15, y: 15 },
  ],
  7: [
    { x: 3, y: 3 },
    { x: 15, y: 3 },
    { x: 3, y: 9 },
    { x: 15, y: 9 },
    { x: 3, y: 15 },
    { x: 15, y: 15 },
    { x: 9, y: 9 },
  ],
  8: [
    { x: 3, y: 3 },
    { x: 9, y: 3 },
    { x: 15, y: 3 },
    { x: 3, y: 9 },
    { x: 15, y: 9 },
    { x: 3, y: 15 },
    { x: 9, y: 15 },
    { x: 15, y: 15 },
  ],
  9: [
    { x: 3, y: 3 },
    { x: 9, y: 3 },
    { x: 15, y: 3 },
    { x: 3, y: 9 },
    { x: 9, y: 9 },
    { x: 15, y: 9 },
    { x: 3, y: 15 },
    { x: 9, y: 15 },
    { x: 15, y: 15 },
  ],
} as const;

// ==========================================
// ERROR MESSAGES
// ==========================================

/**
 * Standard error messages for move validation
 */
export const ERROR_MESSAGES = {
  POSITION_OCCUPIED: 'Position is already occupied',
  INVALID_POSITION: 'Invalid board position',
  SUICIDE_MOVE: 'Suicide moves are not allowed',
  KO_VIOLATION: 'Move violates the Ko rule',
  GAME_FINISHED: 'Game has already finished',
  WRONG_TURN: 'Not your turn to play',
  INVALID_GAME_STATE: 'Invalid game state',
} as const;

// ==========================================
// ANIMATION CONSTANTS
// ==========================================

/**
 * Animation durations in milliseconds
 */
export const ANIMATIONS = {
  STONE_PLACE: 200, // Stone placement animation
  STONE_CAPTURE: 300, // Stone capture animation
  BOARD_TRANSITION: 400, // Board state transitions
  UI_TRANSITION: 150, // General UI transitions
} as const;

// ==========================================
// API CONSTANTS
// ==========================================

/**
 * WebSocket events for multiplayer games
 */
export const WS_EVENTS = {
  // Client to Server
  JOIN_GAME: 'join_game',
  MAKE_MOVE: 'make_move',
  PLAYER_PASS: 'player_pass',
  PLAYER_RESIGN: 'player_resign',
  MARK_TERRITORY: 'mark_territory',

  // Server to Client
  GAME_UPDATED: 'game_updated',
  MOVE_MADE: 'move_made',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  GAME_ENDED: 'game_ended',
  ERROR: 'error',
} as const;

/**
 * HTTP status codes specific to GO game API
 */
export const GAME_HTTP_STATUS = {
  INVALID_MOVE: 422,
  GAME_NOT_FOUND: 404,
  UNAUTHORIZED_MOVE: 403,
  GAME_FULL: 409,
} as const;
