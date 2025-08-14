/**
 * GO Game Board Helpers
 *
 * Specialized helpers for board setup, ASCII diagram parsing, and visual debugging.
 * These utilities make it easy to create test boards from ASCII diagrams and 
 * provide visual feedback during testing.
 */

import {
  Board,
  Position,
  Player,
  BoardSize,
  Stone,
  createPosition,
} from '@go-game/types';

import {
  createEmptyBoard,
  setIntersection,
} from '@go-game/utils';

// ==========================================
// ASCII BOARD PARSING
// ==========================================

/**
 * Parse an ASCII board diagram into a Board object
 * 
 * Format:
 * ```
 * . . . X O . . . .
 * . . . . X . . . .
 * . . . . . . . . .
 * ```
 * 
 * Where:
 * - '.' = empty intersection
 * - 'X' or 'B' = black stone
 * - 'O' or 'W' = white stone
 * - Spaces are ignored
 */
export class AsciiBoardParser {
  private static readonly BLACK_SYMBOLS = ['X', 'B', '●', '#'];
  private static readonly WHITE_SYMBOLS = ['O', 'W', '○', 'o'];
  private static readonly EMPTY_SYMBOLS = ['.', '-', '+', '·'];

  /**
   * Parse ASCII string to board
   */
  static parse(asciiBoard: string, boardSize: BoardSize = BoardSize.SMALL): Board {
    const lines = asciiBoard
      .trim()
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length !== boardSize) {
      throw new Error(`Expected ${boardSize} lines, got ${lines.length}`);
    }

    let board = createEmptyBoard(boardSize);
    let moveCounter = 1;

    for (let y = 0; y < lines.length; y++) {
      const chars = lines[y].split(/\s+/).filter(char => char.length > 0);
      
      if (chars.length !== boardSize) {
        throw new Error(`Line ${y + 1}: expected ${boardSize} positions, got ${chars.length}`);
      }

      for (let x = 0; x < chars.length; x++) {
        const char = chars[x].toUpperCase();
        const position = createPosition(x, y);

        if (this.BLACK_SYMBOLS.includes(char)) {
          const stone: Stone = {
            position,
            player: Player.BLACK,
            moveNumber: moveCounter++,
          };
          board = setIntersection(board, position, stone);
        } else if (this.WHITE_SYMBOLS.includes(char)) {
          const stone: Stone = {
            position,
            player: Player.WHITE,
            moveNumber: moveCounter++,
          };
          board = setIntersection(board, position, stone);
        } else if (!this.EMPTY_SYMBOLS.includes(char)) {
          throw new Error(`Unknown symbol '${char}' at position (${x}, ${y})`);
        }
      }
    }

    return board;
  }

  /**
   * Convert board to ASCII string for debugging
   */
  static stringify(board: Board, options: {
    showCoordinates?: boolean;
    blackSymbol?: string;
    whiteSymbol?: string;
    emptySymbol?: string;
  } = {}): string {
    const {
      showCoordinates = true,
      blackSymbol = 'X',
      whiteSymbol = 'O',
      emptySymbol = '.',
    } = options;

    const size = board.length;
    const lines: string[] = [];

    if (showCoordinates) {
      // Add column headers
      const headers = Array.from({ length: size }, (_, i) => 
        String.fromCharCode(65 + i)
      ).join(' ');
      lines.push(`  ${headers}`);
    }

    for (let y = 0; y < size; y++) {
      const row = [];
      
      if (showCoordinates) {
        row.push((size - y).toString().padStart(2));
      }

      for (let x = 0; x < size; x++) {
        const stone = board[y][x];
        if (!stone) {
          row.push(emptySymbol);
        } else if (stone.player === Player.BLACK) {
          row.push(blackSymbol);
        } else {
          row.push(whiteSymbol);
        }
      }

      if (showCoordinates) {
        row.push((size - y).toString());
      }

      lines.push(row.join(' '));
    }

    if (showCoordinates) {
      const headers = Array.from({ length: size }, (_, i) => 
        String.fromCharCode(65 + i)
      ).join(' ');
      lines.push(`  ${headers}`);
    }

    return lines.join('\n');
  }
}

// ==========================================
// QUICK BOARD SETUP
// ==========================================

/**
 * Quick board setup using template strings
 */
export const ascii = (template: TemplateStringsArray, ...values: any[]): Board => {
  const asciiString = template.raw[0]; // Get raw template string
  return AsciiBoardParser.parse(asciiString);
};

/**
 * Create board from ASCII with size specification
 */
export const asciiBoard = (asciiString: string, boardSize: BoardSize = BoardSize.SMALL): Board => {
  return AsciiBoardParser.parse(asciiString, boardSize);
};

// ==========================================
// BOARD ANALYSIS HELPERS
// ==========================================

/**
 * Board analysis utilities
 */
export class BoardAnalyzer {
  /**
   * Count stones of each color
   */
  static countStones(board: Board): { black: number; white: number } {
    let black = 0;
    let white = 0;

    for (const row of board) {
      for (const stone of row) {
        if (stone) {
          if (stone.player === Player.BLACK) {
            black++;
          } else {
            white++;
          }
        }
      }
    }

    return { black, white };
  }

  /**
   * Find all empty positions
   */
  static findEmptyPositions(board: Board): Position[] {
    const positions: Position[] = [];

    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board[y].length; x++) {
        if (board[y][x] === null) {
          positions.push(createPosition(x, y));
        }
      }
    }

    return positions;
  }

  /**
   * Find all positions with stones of a specific player
   */
  static findPlayerStones(board: Board, player: Player): Position[] {
    const positions: Position[] = [];

    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board[y].length; x++) {
        const stone = board[y][x];
        if (stone && stone.player === player) {
          positions.push(createPosition(x, y));
        }
      }
    }

    return positions;
  }

  /**
   * Check if two boards are identical
   */
  static boardsEqual(board1: Board, board2: Board): boolean {
    if (board1.length !== board2.length) return false;

    for (let y = 0; y < board1.length; y++) {
      if (board1[y].length !== board2[y].length) return false;
      
      for (let x = 0; x < board1[y].length; x++) {
        const stone1 = board1[y][x];
        const stone2 = board2[y][x];

        if (!stone1 && !stone2) continue;
        if (!stone1 || !stone2) return false;
        if (stone1.player !== stone2.player) return false;
        // Note: We don't compare move numbers as they might differ in tests
      }
    }

    return true;
  }

  /**
   * Get board symmetries (rotations and reflections)
   */
  static getSymmetries(board: Board): Board[] {
    const size = board.length;
    const symmetries: Board[] = [];

    // Original
    symmetries.push(board);

    // 90° rotation
    const rotated90 = createEmptyBoard(size as BoardSize);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const stone = board[y][x];
        if (stone) {
          const newPosition = createPosition(size - 1 - y, x);
          setIntersection(rotated90, newPosition, {
            ...stone,
            position: newPosition,
          });
        }
      }
    }
    symmetries.push(rotated90);

    // 180° rotation
    const rotated180 = createEmptyBoard(size as BoardSize);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const stone = board[y][x];
        if (stone) {
          const newPosition = createPosition(size - 1 - x, size - 1 - y);
          setIntersection(rotated180, newPosition, {
            ...stone,
            position: newPosition,
          });
        }
      }
    }
    symmetries.push(rotated180);

    // 270° rotation
    const rotated270 = createEmptyBoard(size as BoardSize);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const stone = board[y][x];
        if (stone) {
          const newPosition = createPosition(y, size - 1 - x);
          setIntersection(rotated270, newPosition, {
            ...stone,
            position: newPosition,
          });
        }
      }
    }
    symmetries.push(rotated270);

    return symmetries;
  }
}

// ==========================================
// VISUAL DEBUGGING HELPERS
// ==========================================

/**
 * Visual debugging utilities
 */
export class BoardDebugger {
  /**
   * Print board to console with nice formatting
   */
  static print(board: Board, title?: string): void {
    if (title) {
      console.log(`\n=== ${title} ===`);
    }
    console.log(AsciiBoardParser.stringify(board));
    
    const counts = BoardAnalyzer.countStones(board);
    console.log(`Black: ${counts.black}, White: ${counts.white}`);
  }

  /**
   * Print board differences
   */
  static printDiff(board1: Board, board2: Board, title?: string): void {
    if (title) {
      console.log(`\n=== ${title} ===`);
    }

    const size = board1.length;
    console.log('Board 1:');
    console.log(AsciiBoardParser.stringify(board1));
    console.log('\nBoard 2:');
    console.log(AsciiBoardParser.stringify(board2));

    // Highlight differences
    const differences: Position[] = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const stone1 = board1[y][x];
        const stone2 = board2[y][x];
        
        const different = (!stone1 && stone2) || 
                         (stone1 && !stone2) || 
                         (stone1 && stone2 && stone1.player !== stone2.player);
        
        if (different) {
          differences.push(createPosition(x, y));
        }
      }
    }

    if (differences.length > 0) {
      console.log(`\nDifferences at positions:`);
      differences.forEach(pos => {
        const stone1 = board1[pos.y][pos.x];
        const stone2 = board2[pos.y][pos.x];
        console.log(`  (${pos.x},${pos.y}): ${stone1?.player || 'empty'} → ${stone2?.player || 'empty'}`);
      });
    } else {
      console.log('\nBoards are identical');
    }
  }

  /**
   * Highlight specific positions on the board
   */
  static highlightPositions(board: Board, positions: Position[], symbol = '*'): string {
    const size = board.length;
    const lines: string[] = [];

    // Add column headers
    const headers = Array.from({ length: size }, (_, i) => 
      String.fromCharCode(65 + i)
    ).join(' ');
    lines.push(`  ${headers}`);

    const positionSet = new Set(positions.map(p => `${p.x},${p.y}`));

    for (let y = 0; y < size; y++) {
      const row = [(size - y).toString().padStart(2)];

      for (let x = 0; x < size; x++) {
        const isHighlighted = positionSet.has(`${x},${y}`);
        
        if (isHighlighted) {
          row.push(symbol);
        } else {
          const stone = board[y][x];
          if (!stone) {
            row.push('.');
          } else if (stone.player === Player.BLACK) {
            row.push('X');
          } else {
            row.push('O');
          }
        }
      }

      row.push((size - y).toString());
      lines.push(row.join(' '));
    }

    lines.push(`  ${headers}`);
    return lines.join('\n');
  }
}

// ==========================================
// MOVE SEQUENCE VISUALIZATION
// ==========================================

/**
 * Move sequence visualization
 */
export class MoveSequenceVisualizer {
  /**
   * Create an animated sequence of boards showing move progression
   */
  static createSequence(
    moves: Array<{ player: Player; x: number; y: number }>,
    boardSize: BoardSize = BoardSize.SMALL
  ): Board[] {
    const sequence: Board[] = [];
    let currentBoard = createEmptyBoard(boardSize);
    
    sequence.push(currentBoard); // Initial empty board
    
    moves.forEach((move, index) => {
      const position = createPosition(move.x, move.y);
      const stone: Stone = {
        position,
        player: move.player,
        moveNumber: index + 1,
      };
      
      currentBoard = setIntersection(currentBoard, position, stone);
      sequence.push(currentBoard);
    });
    
    return sequence;
  }

  /**
   * Print move sequence with step-by-step boards
   */
  static printSequence(
    moves: Array<{ player: Player; x: number; y: number }>,
    boardSize: BoardSize = BoardSize.SMALL
  ): void {
    const sequence = this.createSequence(moves, boardSize);
    
    console.log('\n=== Move Sequence ===');
    console.log('Initial position:');
    console.log(AsciiBoardParser.stringify(sequence[0]));
    
    moves.forEach((move, index) => {
      console.log(`\nMove ${index + 1}: ${move.player} plays at (${move.x}, ${move.y})`);
      console.log(AsciiBoardParser.stringify(sequence[index + 1]));
    });
  }
}

// ==========================================
// EXPORTS
// ==========================================

// All exports are already declared above with export class/export const
// No need for additional export statements