/**
 * Game Factory Utilities
 *
 * Provides convenient factory functions for creating GO games with standard configurations.
 */

import { GameEngine } from './game.js';
import { GameSettings, BoardSize, Player, MoveType } from '@go-game/types';
import { DEFAULT_KOMI, TIME_CONTROLS } from '@go-game/constants';

/**
 * Creates a standard local game
 */
export function createLocalGame(
  boardSize: BoardSize = BoardSize.MEDIUM,
  playerNames?: { black?: string; white?: string }
): GameEngine {
  const settings: GameSettings = {
    boardSize,
    komi: DEFAULT_KOMI[boardSize],
    gameType: 'local',
    players: {
      black: playerNames?.black || 'Black Player',
      white: playerNames?.white || 'White Player',
    },
  };

  return new GameEngine(settings);
}

/**
 * Creates a game with specific time controls
 */
export function createTimedGame(
  boardSize: BoardSize,
  timeControl: keyof typeof TIME_CONTROLS,
  playerNames?: { black?: string; white?: string }
): GameEngine {
  const timeSettings = TIME_CONTROLS[timeControl] as any;

  const settings: GameSettings = {
    boardSize,
    komi: DEFAULT_KOMI[boardSize],
    gameType: 'local',
    timeSettings: {
      mainTime: timeSettings.mainTime,
      ...(timeSettings.byoyomi && { byoyomi: timeSettings.byoyomi }),
      ...(timeSettings.periods && { periods: timeSettings.periods }),
    },
    players: {
      black: playerNames?.black || 'Black Player',
      white: playerNames?.white || 'White Player',
    },
  };

  return new GameEngine(settings);
}

/**
 * Creates a quick game for testing/demo purposes
 */
export function createQuickGame(): GameEngine {
  return createLocalGame(BoardSize.SMALL, {
    black: 'Demo Black',
    white: 'Demo White',
  });
}

/**
 * Creates a professional game (19x19 with standard settings)
 */
export function createProfessionalGame(playerNames?: {
  black?: string;
  white?: string;
}): GameEngine {
  return createTimedGame(BoardSize.LARGE, 'NORMAL', playerNames);
}

/**
 * Creates a beginner-friendly game (9x9 with relaxed time)
 */
export function createBeginnerGame(playerNames?: {
  black?: string;
  white?: string;
}): GameEngine {
  const settings: GameSettings = {
    boardSize: BoardSize.SMALL,
    komi: DEFAULT_KOMI[BoardSize.SMALL],
    gameType: 'local',
    timeSettings: {
      mainTime: 1800, // 30 minutes
      byoyomi: 120, // 2 minutes per move
      periods: 3,
    },
    players: {
      black: playerNames?.black || 'Black Player',
      white: playerNames?.white || 'White Player',
    },
  };

  return new GameEngine(settings);
}

/**
 * Creates a standard game for intermediate players
 * - 13x13 board
 * - Standard komi of 6.5
 */
export function createStandardGame(): GameEngine {
  const settings: GameSettings = {
    boardSize: BoardSize.MEDIUM,
    komi: 6.5,
    gameType: 'local',
    players: {
      black: 'Black Player',
      white: 'White Player',
    },
  };

  return new GameEngine(settings);
}

/**
 * Creates a game that's ready for scoring phase testing
 * - Pre-filled board with territories
 * - Some captured stones
 * - Ready to pass twice to enter scoring
 */
export function createScoringTestGame(): GameEngine {
  const engine = createBeginnerGame();

  // Create a realistic endgame position
  // Black territory in top-left, White territory in bottom-right
  const moves = [
    // Black builds top-left corner
    { player: Player.BLACK, pos: { x: 2, y: 2 } },
    { player: Player.WHITE, pos: { x: 6, y: 6 } },
    { player: Player.BLACK, pos: { x: 2, y: 3 } },
    { player: Player.WHITE, pos: { x: 6, y: 5 } },
    { player: Player.BLACK, pos: { x: 3, y: 2 } },
    { player: Player.WHITE, pos: { x: 5, y: 6 } },
    { player: Player.BLACK, pos: { x: 3, y: 3 } },
    { player: Player.WHITE, pos: { x: 5, y: 5 } },
    { player: Player.BLACK, pos: { x: 1, y: 2 } },
    { player: Player.WHITE, pos: { x: 7, y: 6 } },
    { player: Player.BLACK, pos: { x: 2, y: 1 } },
    { player: Player.WHITE, pos: { x: 6, y: 7 } },

    // Create some boundaries
    { player: Player.BLACK, pos: { x: 4, y: 3 } },
    { player: Player.WHITE, pos: { x: 4, y: 5 } },
    { player: Player.BLACK, pos: { x: 3, y: 4 } },
    { player: Player.WHITE, pos: { x: 5, y: 4 } },

    // Add stones that could be marked as dead
    { player: Player.WHITE, pos: { x: 1, y: 1 } }, // White stone in Black territory
    { player: Player.BLACK, pos: { x: 7, y: 7 } }, // Black stone in White territory

    // Few more moves to make it realistic
    { player: Player.BLACK, pos: { x: 2, y: 4 } },
    { player: Player.WHITE, pos: { x: 6, y: 4 } },
    { player: Player.BLACK, pos: { x: 4, y: 2 } },
    { player: Player.WHITE, pos: { x: 4, y: 6 } },
  ];

  // Execute all moves
  moves.forEach(({ player, pos }) => {
    engine.makeMove(player, MoveType.PLACE_STONE, pos);
  });

  return engine;
}
