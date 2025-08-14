/**
 * GO Game Test Fixtures
 *
 * Pre-defined board patterns, game scenarios, and test data for Go game testing.
 * These fixtures provide common scenarios like captures, Ko situations, territory patterns, etc.
 */

import {
  Player,
  BoardSize,
  MoveType,
  Board,
  Stone,
  createPosition,
} from '@go-game/types';

import {
  createEmptyBoard,
  setIntersection,
} from '@go-game/utils';

// Helper function to create boards (avoiding circular import)
function createTestBoard(boardSize: BoardSize = BoardSize.SMALL): Board {
  return createEmptyBoard(boardSize);
}

// Helper function to place stones
function placeStone(board: Board, x: number, y: number, player: Player, moveNumber = 1): Board {
  const position = createPosition(x, y);
  const stone: Stone = {
    position,
    player,
    moveNumber,
  };
  return setIntersection(board, position, stone);
}

// Helper function to place multiple stones
function placeStones(board: Board, positions: Array<[number, number]>, player: Player, startMoveNumber = 1): Board {
  let result = board;
  positions.forEach(([x, y], index) => {
    result = placeStone(result, x, y, player, startMoveNumber + index);
  });
  return result;
}

// ==========================================
// BOARD PATTERN FIXTURES
// ==========================================

/**
 * Empty boards of different sizes
 */
export const EmptyBoards = {
  small: createTestBoard(BoardSize.SMALL),
  medium: createTestBoard(BoardSize.MEDIUM),
  large: createTestBoard(BoardSize.LARGE),
} as const;

/**
 * Simple stone patterns
 */
export const SimplePatterns = {
  /**
   * Single black stone in center of 9x9 board
   */
  centerStone: placeStone(createTestBoard(BoardSize.SMALL), 4, 4, Player.BLACK),

  /**
   * Two stones diagonal from each other
   */
  diagonal: (() => {
    let board = createTestBoard(BoardSize.SMALL);
    board = placeStone(board, 2, 2, Player.BLACK, 1);
    board = placeStone(board, 6, 6, Player.WHITE, 2);
    return board;
  })(),

  /**
   * Four corners occupied
   */
  corners: (() => {
    let board = createTestBoard(BoardSize.SMALL);
    board = placeStone(board, 0, 0, Player.BLACK, 1);
    board = placeStone(board, 8, 0, Player.WHITE, 2);
    board = placeStone(board, 0, 8, Player.BLACK, 3);
    board = placeStone(board, 8, 8, Player.WHITE, 4);
    return board;
  })(),

  /**
   * Cross pattern in center
   */
  cross: placeStones(createTestBoard(BoardSize.SMALL), 
    [[4, 3], [4, 4], [4, 5], [3, 4], [5, 4]], Player.BLACK),

  /**
   * Line of stones
   */
  line: placeStones(createTestBoard(BoardSize.SMALL), 
    [[2, 4], [3, 4], [4, 4], [5, 4], [6, 4]], Player.BLACK),
} as const;

/**
 * Capture scenarios
 */
export const CapturePatterns = {
  /**
   * Simple capture - white stone surrounded by black
   */
  simpleCapture: (() => {
    let board = createTestBoard(BoardSize.SMALL);
    board = placeStone(board, 0, 0, Player.WHITE, 2);
    board = placeStone(board, 0, 1, Player.BLACK, 1);
    board = placeStone(board, 1, 0, Player.BLACK, 3);
    return board;
  })(),

  /**
   * Corner capture setup
   */
  cornerCapture: (() => {
    let board = createTestBoard(BoardSize.SMALL);
    board = placeStone(board, 0, 0, Player.WHITE, 2);
    board = placeStone(board, 0, 1, Player.BLACK, 1);
    board = placeStone(board, 1, 0, Player.BLACK, 3);
    return board;
  })(),

  /**
   * Group capture - multiple stones captured together
   */
  groupCapture: (() => {
    let board = createTestBoard(BoardSize.SMALL);
    board = placeStone(board, 2, 2, Player.WHITE, 2);
    board = placeStone(board, 3, 2, Player.WHITE, 4);
    board = placeStone(board, 1, 2, Player.BLACK, 1);
    board = placeStone(board, 4, 2, Player.BLACK, 3);
    board = placeStone(board, 2, 1, Player.BLACK, 5);
    board = placeStone(board, 3, 1, Player.BLACK, 6);
    board = placeStone(board, 2, 3, Player.BLACK, 7);
    board = placeStone(board, 3, 3, Player.BLACK, 8);
    return board;
  })(),

  /**
   * Self-capture situation (suicide move)
   */
  selfCapture: (() => {
    let board = createTestBoard(BoardSize.SMALL);
    board = placeStone(board, 1, 0, Player.WHITE, 1);
    board = placeStone(board, 0, 1, Player.WHITE, 2);
    board = placeStone(board, 2, 1, Player.WHITE, 3);
    board = placeStone(board, 1, 2, Player.WHITE, 4);
    // Playing black at (1, 1) would be suicide
    return board;
  })(),
} as const;

/**
 * Ko rule scenarios
 */
export const KoPatterns = {
  /**
   * Basic Ko situation
   */
  basicKo: (() => {
    let board = createTestBoard(BoardSize.SMALL);
    board = placeStone(board, 0, 1, Player.BLACK, 1);
    board = placeStone(board, 1, 0, Player.WHITE, 2);
    board = placeStone(board, 2, 1, Player.BLACK, 3);
    board = placeStone(board, 1, 2, Player.WHITE, 4);
    board = placeStone(board, 1, 1, Player.BLACK, 5);
    board = placeStone(board, 2, 0, Player.WHITE, 6);
    board = placeStone(board, 0, 0, Player.BLACK, 7);
    return board;
  })(),
} as const;

/**
 * Territory patterns for scoring
 */
export const TerritoryPatterns = {
  /**
   * Clear black territory in corner
   */
  blackCornerTerritory: (() => {
    let board = createTestBoard(BoardSize.SMALL);
    board = placeStone(board, 2, 0, Player.BLACK, 1);
    board = placeStone(board, 2, 1, Player.BLACK, 2);
    board = placeStone(board, 2, 2, Player.BLACK, 3);
    board = placeStone(board, 0, 2, Player.BLACK, 4);
    board = placeStone(board, 1, 2, Player.BLACK, 5);
    return board;
  })(),

  /**
   * Complex territory with dead stones
   */
  complexTerritory: (() => {
    let board = createTestBoard(BoardSize.SMALL);
    board = placeStone(board, 1, 1, Player.BLACK, 1);
    board = placeStone(board, 1, 2, Player.BLACK, 2);
    board = placeStone(board, 2, 3, Player.BLACK, 3);
    board = placeStone(board, 3, 3, Player.BLACK, 4);
    board = placeStone(board, 4, 2, Player.BLACK, 5);
    board = placeStone(board, 4, 1, Player.BLACK, 6);
    board = placeStone(board, 2, 1, Player.WHITE, 7); // Dead white stone
    board = placeStone(board, 3, 1, Player.WHITE, 8); // Dead white stone
    return board;
  })(),
} as const;

// ==========================================
// MOVE SEQUENCES
// ==========================================

/**
 * Common move sequences for testing
 */
export const MoveSequences = {
  /**
   * Opening moves - star point pattern
   */
  opening: [
    { player: Player.BLACK, x: 4, y: 4 },  // Center
    { player: Player.WHITE, x: 2, y: 2 },  // Corner
    { player: Player.BLACK, x: 6, y: 6 },  // Opposite corner
    { player: Player.WHITE, x: 2, y: 6 },  // Side
  ],

  /**
   * Capture sequence
   */
  captureSequence: [
    { player: Player.BLACK, x: 0, y: 1 },
    { player: Player.WHITE, x: 0, y: 0 },
    { player: Player.BLACK, x: 1, y: 0 },  // Captures white
  ],

  /**
   * Territory building sequence
   */
  territoryBuilding: [
    { player: Player.BLACK, x: 2, y: 0 },
    { player: Player.WHITE, x: 6, y: 6 },
    { player: Player.BLACK, x: 2, y: 1 },
    { player: Player.WHITE, x: 6, y: 7 },
    { player: Player.BLACK, x: 2, y: 2 },
    { player: Player.WHITE, x: 6, y: 8 },
  ],

  /**
   * Game ending sequence (two passes)
   */
  endingSequence: [
    { player: Player.BLACK, type: MoveType.PASS },
    { player: Player.WHITE, type: MoveType.PASS },
  ] as Array<{ player: Player; type?: MoveType; x?: number; y?: number }>,

  /**
   * Resignation sequence
   */
  resignationSequence: [
    { player: Player.BLACK, x: 4, y: 4 },
    { player: Player.WHITE, type: MoveType.RESIGN },
  ] as Array<{ player: Player; type?: MoveType; x?: number; y?: number }>,
} as const;

// ==========================================
// ERROR SCENARIOS
// ==========================================

/**
 * Error scenarios for testing validation
 */
export const ErrorScenarios = {
  /**
   * Occupied position error
   */
  occupiedPosition: {
    board: placeStone(createTestBoard(BoardSize.SMALL), 4, 4, Player.BLACK),
    move: { player: Player.WHITE, x: 4, y: 4 },
    expectedError: 'Position is already occupied',
  },

  /**
   * Out of bounds error
   */
  outOfBounds: {
    board: createTestBoard(BoardSize.SMALL),
    move: { player: Player.BLACK, x: 10, y: 10 },
    expectedError: 'Invalid board position',
  },

  /**
   * Suicide move error
   */
  suicideMove: {
    board: CapturePatterns.selfCapture,
    move: { player: Player.BLACK, x: 1, y: 1 },
    expectedError: 'Suicide moves are not allowed',
  },
} as const;

// ==========================================
// SCORING TEST DATA
// ==========================================

/**
 * Scoring test scenarios
 */
export const ScoringScenarios = {
  /**
   * Simple scoring - clear territories
   */
  simple: {
    board: TerritoryPatterns.blackCornerTerritory,
    expectedScore: {
      black: { territory: 4, captures: 0 },
      white: { territory: 0, captures: 0 },
    },
  },

  /**
   * Complex scoring with dead stones
   */
  withDeadStones: {
    board: TerritoryPatterns.complexTerritory,
    deadStones: new Set(['2,1', '3,1']),  // White stones in black territory
    expectedScore: {
      black: { territory: 6, captures: 2 },
      white: { territory: 0, captures: 0 },
    },
  },
} as const;

// ==========================================
// PERFORMANCE TEST DATA
// ==========================================

/**
 * Data for performance testing
 */
export const PerformanceTestData = {
  /**
   * Large number of moves for stress testing
   */
  manyMoves: Array.from({ length: 100 }, (_, i) => ({
    player: i % 2 === 0 ? Player.BLACK : Player.WHITE,
    x: Math.floor(Math.random() * 9),
    y: Math.floor(Math.random() * 9),
  })),
} as const;

// ==========================================
// ASCII BOARD REPRESENTATIONS
// ==========================================

/**
 * ASCII representations for debugging and documentation
 */
export const AsciiBoards = {
  /**
   * Simple capture pattern
   */
  simpleCapture: `
  A B C D E F G H J
9 . . . . . . . . . 9
8 . . . . . . . . . 8
7 . . . . . . . . . 7
6 . . . . . . . . . 6
5 . . . . . . . . . 5
4 . . . . . . . . . 4
3 . . . . . . . . . 3
2 . . . . . . . . . 2
1 O X . . . . . . . 1
  A B C D E F G H J
`,

  /**
   * Ko situation
   */
  ko: `
  A B C D E F G H J
9 . . . . . . . . . 9
8 . . . . . . . . . 8
7 . . . . . . . . . 7
6 . . . . . . . . . 6
5 . . . . . . . . . 5
4 . . . . . . . . . 4
3 . X O . . . . . . 3
2 X . X . . . . . . 2
1 . X . . . . . . . 1
  A B C D E F G H J
`,
} as const;

// ==========================================
// EXPORTS
// ==========================================

export default {
  EmptyBoards,
  SimplePatterns,
  CapturePatterns,
  KoPatterns,
  TerritoryPatterns,
  MoveSequences,
  ErrorScenarios,
  ScoringScenarios,
  PerformanceTestData,
  AsciiBoards,
};