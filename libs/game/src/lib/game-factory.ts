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
