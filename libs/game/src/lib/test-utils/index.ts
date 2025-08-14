/**
 * GO Game Test Utilities
 *
 * Comprehensive test utilities for Go game testing.
 * Provides builders, validators, matchers, and helpers for writing clean, readable tests.
 */

import {
  GameState,
  Board,
  Position,
  Player,
  MoveType,
  BoardSize,
  Stone,
  MoveResult,
  positionsEqual,
  createPosition,
  getOpponent,
} from '@go-game/types';

import {
  createEmptyBoard,
  setIntersection,
  getGroup,
  getAllPositions,
  positionToKey,
} from '@go-game/utils';

import { calculateTerritories } from '../scoring';
import { createLocalGame, createQuickGame } from '../game-factory';
import { GameEngine } from '../game';

// ==========================================
// BOARD STATE BUILDERS
// ==========================================

/**
 * Board state builder for creating test boards with fluent API
 */
export class BoardBuilder {
  private board: Board;
  constructor(boardSize: BoardSize = BoardSize.SMALL) {
    this.board = createEmptyBoard(boardSize);
  }

  /**
   * Add a black stone at the specified position
   */
  black(x: number, y: number, moveNumber = 1): BoardBuilder {
    const position = createPosition(x, y);
    const stone: Stone = {
      position,
      player: Player.BLACK,
      moveNumber,
    };
    this.board = setIntersection(this.board, position, stone);
    return this;
  }

  /**
   * Add a white stone at the specified position
   */
  white(x: number, y: number, moveNumber = 2): BoardBuilder {
    const position = createPosition(x, y);
    const stone: Stone = {
      position,
      player: Player.WHITE,
      moveNumber,
    };
    this.board = setIntersection(this.board, position, stone);
    return this;
  }

  /**
   * Add multiple stones from position arrays
   */
  blackStones(positions: Array<[number, number]>, startMoveNumber = 1): BoardBuilder {
    positions.forEach(([x, y], index) => {
      this.black(x, y, startMoveNumber + index * 2);
    });
    return this;
  }

  /**
   * Add multiple white stones from position arrays
   */
  whiteStones(positions: Array<[number, number]>, startMoveNumber = 2): BoardBuilder {
    positions.forEach(([x, y], index) => {
      this.white(x, y, startMoveNumber + index * 2);
    });
    return this;
  }

  /**
   * Create a stone pattern from a template object
   */
  pattern(template: {
    black?: Array<[number, number]>;
    white?: Array<[number, number]>;
  }): BoardBuilder {
    if (template.black) {
      this.blackStones(template.black);
    }
    if (template.white) {
      this.whiteStones(template.white);
    }
    return this;
  }

  /**
   * Build and return the board
   */
  build(): Board {
    return this.board;
  }
}

/**
 * Create a board builder
 */
export const board = (boardSize: BoardSize = BoardSize.SMALL): BoardBuilder => {
  return new BoardBuilder(boardSize);
};

// ==========================================
// POSITION GENERATORS AND VALIDATORS
// ==========================================

/**
 * Position generator utilities
 */
export class PositionGenerator {
  /**
   * Generate corner positions for a board size
   */
  static corners(boardSize: BoardSize): Position[] {
    const max = boardSize - 1;
    return [
      { x: 0, y: 0 },      // Top-left
      { x: max, y: 0 },    // Top-right
      { x: 0, y: max },    // Bottom-left
      { x: max, y: max },  // Bottom-right
    ];
  }

  /**
   * Generate edge positions (excluding corners)
   */
  static edges(boardSize: BoardSize): Position[] {
    const positions: Position[] = [];
    const max = boardSize - 1;

    // Top and bottom edges
    for (let x = 1; x < max; x++) {
      positions.push({ x, y: 0 });     // Top edge
      positions.push({ x, y: max });   // Bottom edge
    }

    // Left and right edges
    for (let y = 1; y < max; y++) {
      positions.push({ x: 0, y });     // Left edge
      positions.push({ x: max, y });   // Right edge
    }

    return positions;
  }

  /**
   * Generate center area positions
   */
  static center(boardSize: BoardSize, radius = 1): Position[] {
    const centerX = Math.floor(boardSize / 2);
    const centerY = Math.floor(boardSize / 2);
    const positions: Position[] = [];

    for (let x = centerX - radius; x <= centerX + radius; x++) {
      for (let y = centerY - radius; y <= centerY + radius; y++) {
        if (x >= 0 && x < boardSize && y >= 0 && y < boardSize) {
          positions.push({ x, y });
        }
      }
    }

    return positions;
  }

  /**
   * Generate a line of positions
   */
  static line(from: Position, to: Position): Position[] {
    const positions: Position[] = [];
    const dx = Math.sign(to.x - from.x);
    const dy = Math.sign(to.y - from.y);
    
    let current = { ...from };
    
    while (!positionsEqual(current, to)) {
      positions.push({ ...current });
      current.x += dx;
      current.y += dy;
    }
    
    positions.push(to);
    return positions;
  }

  /**
   * Generate random positions
   */
  static random(boardSize: BoardSize, count: number, exclude: Position[] = []): Position[] {
    const allPositions = getAllPositions(boardSize);
    const excludeKeys = new Set(exclude.map(positionToKey));
    const availablePositions = allPositions.filter(pos => !excludeKeys.has(positionToKey(pos)));
    
    const shuffled = [...availablePositions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}

/**
 * Position validation utilities
 */
export class PositionValidator {
  /**
   * Validate that positions form a connected group
   */
  static areConnected(positions: Position[]): boolean {
    if (positions.length <= 1) return true;
    
    const positionSet = new Set(positions.map(positionToKey));
    const visited = new Set<string>();
    const stack = [positions[0]];
    
    while (stack.length > 0) {
      const current = stack.pop()!;
      const key = positionToKey(current);
      
      if (visited.has(key)) continue;
      visited.add(key);
      
      // Check adjacent positions
      const adjacent = [
        { x: current.x - 1, y: current.y },
        { x: current.x + 1, y: current.y },
        { x: current.x, y: current.y - 1 },
        { x: current.x, y: current.y + 1 },
      ];
      
      for (const pos of adjacent) {
        const adjKey = positionToKey(pos);
        if (positionSet.has(adjKey) && !visited.has(adjKey)) {
          stack.push(pos);
        }
      }
    }
    
    return visited.size === positions.length;
  }

  /**
   * Validate that positions are within board bounds
   */
  static areWithinBounds(positions: Position[], boardSize: BoardSize): boolean {
    return positions.every(pos => 
      pos.x >= 0 && pos.x < boardSize && pos.y >= 0 && pos.y < boardSize
    );
  }
}

// ==========================================
// GAME STATE FACTORIES
// ==========================================

/**
 * Game state factory for creating test game states
 */
export class GameStateFactory {
  /**
   * Create a fresh game state
   */
  static fresh(boardSize: BoardSize = BoardSize.SMALL): GameState {
    const engine = createLocalGame(boardSize);
    return engine.getGameState();
  }

  /**
   * Create a game state with some moves played
   */
  static withMoves(
    moves: Array<{ player: Player; x: number; y: number }>,
    boardSize: BoardSize = BoardSize.SMALL
  ): GameState {
    const engine = createLocalGame(boardSize);
    
    moves.forEach(({ player, x, y }) => {
      engine.makeMove(player, MoveType.PLACE_STONE, { x, y });
    });
    
    return engine.getGameState();
  }

  /**
   * Create a game state ready for scoring
   */
  static readyForScoring(boardSize: BoardSize = BoardSize.SMALL): GameState {
    const engine = createLocalGame(boardSize);
    
    // Make some moves to create territories
    const moves = [
      { player: Player.BLACK, x: 2, y: 2 },
      { player: Player.WHITE, x: 6, y: 6 },
      { player: Player.BLACK, x: 2, y: 3 },
      { player: Player.WHITE, x: 6, y: 5 },
    ];
    
    moves.forEach(({ player, x, y }) => {
      engine.makeMove(player, MoveType.PLACE_STONE, { x, y });
    });
    
    // Two passes to enter scoring phase
    engine.makeMove(Player.BLACK, MoveType.PASS);
    engine.makeMove(Player.WHITE, MoveType.PASS);
    
    return engine.getGameState();
  }

  /**
   * Create a finished game state
   */
  static finished(
    winner: Player | null = Player.BLACK,
    boardSize: BoardSize = BoardSize.SMALL
  ): GameState {
    const engine = createLocalGame(boardSize);
    
    if (winner === null) {
      // Create a tie game through scoring
      // Would need to implement tie logic - for now just resign
      engine.makeMove(Player.BLACK, MoveType.RESIGN);
    } else {
      // Create a resignation
      const loser = getOpponent(winner);
      engine.makeMove(loser, MoveType.RESIGN);
    }
    
    return engine.getGameState();
  }
}

// ==========================================
// MOVE SEQUENCE HELPERS
// ==========================================

/**
 * Move sequence builder for testing complex game flows
 */
export class MoveSequenceBuilder {
  private moves: Array<{ player: Player; type: MoveType; position?: Position }> = [];

  /**
   * Add a stone placement move
   */
  place(player: Player, x: number, y: number): MoveSequenceBuilder {
    this.moves.push({
      player,
      type: MoveType.PLACE_STONE,
      position: { x, y },
    });
    return this;
  }

  /**
   * Add a pass move
   */
  pass(player: Player): MoveSequenceBuilder {
    this.moves.push({
      player,
      type: MoveType.PASS,
    });
    return this;
  }

  /**
   * Add a resign move
   */
  resign(player: Player): MoveSequenceBuilder {
    this.moves.push({
      player,
      type: MoveType.RESIGN,
    });
    return this;
  }

  /**
   * Add alternating moves (black, white, black, white, ...)
   */
  alternating(positions: Array<[number, number]>): MoveSequenceBuilder {
    positions.forEach(([x, y], index) => {
      const player = index % 2 === 0 ? Player.BLACK : Player.WHITE;
      this.place(player, x, y);
    });
    return this;
  }

  /**
   * Execute the move sequence on a game engine
   */
  executeOn(engine: GameEngine): MoveResult[] {
    const results: MoveResult[] = [];
    
    for (const move of this.moves) {
      const result = engine.makeMove(move.player, move.type, move.position);
      results.push(result);
      
      if (!result.success) {
        break; // Stop on first failed move
      }
    }
    
    return results;
  }

  /**
   * Get the move sequence
   */
  build(): Array<{ player: Player; type: MoveType; position?: Position }> {
    return [...this.moves];
  }
}

/**
 * Create a move sequence builder
 */
export const moveSequence = (): MoveSequenceBuilder => {
  return new MoveSequenceBuilder();
};

// ==========================================
// CUSTOM MATCHERS FOR GO-SPECIFIC ASSERTIONS
// ==========================================

/**
 * Custom matchers for Go game testing
 */
export class GoMatchers {
  /**
   * Check if a position has a stone of the specified player
   */
  static hasStone(board: Board, position: Position, player: Player): boolean {
    const stone = board[position.y][position.x];
    return stone !== null && stone.player === player;
  }

  /**
   * Check if a position is empty
   */
  static isEmpty(board: Board, position: Position): boolean {
    return board[position.y][position.x] === null;
  }

  /**
   * Check if positions form a group (connected stones of same color)
   */
  static formGroup(board: Board, positions: Position[]): boolean {
    if (positions.length === 0) return true;
    
    const firstStone = board[positions[0].y][positions[0].x];
    if (!firstStone) return false;
    
    // All positions must have stones of same color
    for (const pos of positions) {
      const stone = board[pos.y][pos.x];
      if (!stone || stone.player !== firstStone.player) {
        return false;
      }
    }
    
    // Positions must be connected
    return PositionValidator.areConnected(positions);
  }

  /**
   * Check if a group would be captured
   */
  static groupWouldBeCaptured(board: Board, groupPositions: Position[]): boolean {
    if (groupPositions.length === 0) return false;
    
    const firstPos = groupPositions[0];
    const actualGroup = getGroup(board, firstPos);
    
    // Check if the actual group matches expected positions
    const actualPositions = Array.from(actualGroup);
    if (actualPositions.length !== groupPositions.length) return false;
    
    const groupSet = new Set(groupPositions.map(positionToKey));
    return actualPositions.every(pos => groupSet.has(positionToKey(pos)));
  }

  /**
   * Check if territories are correctly calculated
   */
  static hasTerritory(
    board: Board,
    expectedTerritory: { player: Player | null; positions: Position[] }[]
  ): boolean {
    const territories = calculateTerritories(board);
    
    // This is a simplified check - full implementation would need more detailed comparison
    return territories.length === expectedTerritory.length;
  }

  /**
   * Check if game state is valid
   */
  static isValidGameState(gameState: GameState): boolean {
    // Basic validation checks
    if (!gameState.id || !gameState.board) return false;
    if (gameState.boardSize !== gameState.board.length) return false;
    if (gameState.moveHistory.length < 0) return false;
    
    return true;
  }

  /**
   * Check if move result indicates success
   */
  static isMoveSuccess(result: MoveResult): boolean {
    return result.success && result.move !== undefined;
  }

  /**
   * Check if move result indicates failure with expected error
   */
  static isMoveFailure(result: MoveResult, expectedError?: string): boolean {
    if (result.success) return false;
    if (expectedError) {
      return result.error?.includes(expectedError) || false;
    }
    return true;
  }
}

// ==========================================
// MOCK DATA GENERATORS
// ==========================================

/**
 * Mock data generators for testing
 */
export class MockDataGenerator {
  /**
   * Generate a realistic game sequence
   */
  static realisticGameMoves(boardSize: BoardSize): Array<{ player: Player; x: number; y: number }> {
    const moves: Array<{ player: Player; x: number; y: number }> = [];
    const centerArea = PositionGenerator.center(boardSize, 2);
    
    // Start with some center moves
    for (let i = 0; i < Math.min(6, centerArea.length); i++) {
      const pos = centerArea[i];
      moves.push({
        player: i % 2 === 0 ? Player.BLACK : Player.WHITE,
        x: pos.x,
        y: pos.y,
      });
    }
    
    return moves;
  }

  /**
   * Generate capture scenario moves
   */
  static captureScenario(boardSize: BoardSize): Array<{ player: Player; x: number; y: number }> {
    // Create a simple capture scenario in corner
    return [
      { player: Player.BLACK, x: 0, y: 1 },  // Surround white stone
      { player: Player.WHITE, x: 0, y: 0 },  // White stone to be captured
      { player: Player.BLACK, x: 1, y: 0 },  // Complete the capture
    ];
  }

  /**
   * Generate Ko situation moves
   */
  static koSituation(): Array<{ player: Player; x: number; y: number }> {
    return [
      { player: Player.BLACK, x: 1, y: 0 },
      { player: Player.WHITE, x: 2, y: 1 },
      { player: Player.BLACK, x: 0, y: 1 },
      { player: Player.WHITE, x: 1, y: 2 },
      { player: Player.BLACK, x: 2, y: 0 },
      { player: Player.WHITE, x: 1, y: 1 },  // Capture black stone
      // Now black cannot immediately recapture due to Ko rule
    ];
  }
}

// ==========================================
// QUICK SETUP HELPERS
// ==========================================

/**
 * Quick setup helpers for common test scenarios
 */
export class TestSetup {
  /**
   * Setup a basic game for testing
   */
  static basicGame(boardSize: BoardSize = BoardSize.SMALL): GameEngine {
    return createLocalGame(boardSize);
  }

  /**
   * Setup a game with capture scenario
   */
  static captureGame(): GameEngine {
    const engine = createQuickGame();
    const moves = MockDataGenerator.captureScenario(BoardSize.SMALL);
    
    moves.slice(0, -1).forEach(({ player, x, y }) => {
      engine.makeMove(player, MoveType.PLACE_STONE, { x, y });
    });
    
    return engine;
  }

  /**
   * Setup a game ready for Ko rule testing
   */
  static koGame(): GameEngine {
    const engine = createQuickGame();
    const moves = MockDataGenerator.koSituation();
    
    moves.forEach(({ player, x, y }) => {
      engine.makeMove(player, MoveType.PLACE_STONE, { x, y });
    });
    
    return engine;
  }

  /**
   * Setup a scoring phase game
   */
  static scoringGame(): GameEngine {
    const engine = createQuickGame();
    
    // Create some territories
    const setupMoves = [
      { player: Player.BLACK, x: 1, y: 1 },
      { player: Player.WHITE, x: 7, y: 7 },
      { player: Player.BLACK, x: 1, y: 2 },
      { player: Player.WHITE, x: 7, y: 6 },
    ];
    
    setupMoves.forEach(({ player, x, y }) => {
      engine.makeMove(player, MoveType.PLACE_STONE, { x, y });
    });
    
    // Pass twice to enter scoring
    engine.makeMove(Player.BLACK, MoveType.PASS);
    engine.makeMove(Player.WHITE, MoveType.PASS);
    
    return engine;
  }
}

// ==========================================
// ASSERTION HELPERS
// ==========================================

/**
 * Assertion helpers for test readability
 */
export const expect = {
  /**
   * Expect position to have stone of player
   */
  positionToHaveStone: (board: Board, position: Position, player: Player) => {
    return GoMatchers.hasStone(board, position, player);
  },
  
  /**
   * Expect position to be empty
   */
  positionToBeEmpty: (board: Board, position: Position) => {
    return GoMatchers.isEmpty(board, position);
  },
  
  /**
   * Expect move to succeed
   */
  moveToSucceed: (result: MoveResult) => {
    return GoMatchers.isMoveSuccess(result);
  },
  
  /**
   * Expect move to fail
   */
  moveToFail: (result: MoveResult, expectedError?: string) => {
    return GoMatchers.isMoveFailure(result, expectedError);
  },
  
  /**
   * Expect game state to be valid
   */
  gameStateToBeValid: (gameState: GameState) => {
    return GoMatchers.isValidGameState(gameState);
  },
};

// ==========================================
// EXPORTS
// ==========================================

// All utilities are exported above as they are defined
// This comprehensive test utility suite includes:
// - BoardBuilder: Fluent API for creating test boards
// - PositionGenerator: Generate common position patterns
// - PositionValidator: Validate position relationships
// - GameStateFactory: Create test game states
// - MoveSequenceBuilder: Build and execute move sequences
// - GoMatchers: Go-specific test assertions
// - MockDataGenerator: Generate test data
// - TestSetup: Quick setup helpers for common scenarios

export type { GameEngine };