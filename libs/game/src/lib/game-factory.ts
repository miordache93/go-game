/**
 * Game Factory Utilities
 *
 * Provides convenient factory functions for creating GO games with standard configurations.
 */

import { GameEngine } from './game.js';
import { GameSettings, BoardSize } from '@go-game/types';
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
 * Creates a demo game with some pre-placed stones for visual demonstration
 * TODO: Fix TypeScript issues and re-enable
 */
/*
export function createDemoGame(): GameEngine {
  const engine = createBeginnerGame({
    black: 'Demo Black',
    white: 'Demo White',
  });

  // Add some demo stones to showcase the board
  // These represent a realistic game opening
  const demoMoves = [
    // Black opening moves
    { player: Player.BLACK, position: { x: 2, y: 2 } }, // Bottom-left corner approach
    { player: Player.WHITE, position: { x: 6, y: 2 } }, // Bottom-right corner approach
    { player: Player.BLACK, position: { x: 2, y: 6 } }, // Top-left corner approach
    { player: Player.WHITE, position: { x: 6, y: 6 } }, // Top-right corner approach
    { player: Player.BLACK, position: { x: 4, y: 4 } }, // Center/tengen
    { player: Player.WHITE, position: { x: 3, y: 3 } }, // Defensive move
    { player: Player.BLACK, position: { x: 5, y: 5 } }, // Extension
    { player: Player.WHITE, position: { x: 1, y: 4 } }, // Side extension
    { player: Player.BLACK, position: { x: 7, y: 4 } }, // Opposite side
    { player: Player.WHITE, position: { x: 4, y: 1 } }, // Bottom side
  ];

  // Place the demo stones
  demoMoves.forEach(({ player, position }) => {
    engine.makeMove(player, MoveType.PLACE_STONE, position);
  });

  return engine;
}
*/
