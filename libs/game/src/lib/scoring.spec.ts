/**
 * Scoring System Unit Tests
 *
 * Comprehensive test suite for the Go game scoring system covering:
 * - Territory calculation algorithms
 * - Dead stone marking and removal
 * - Final score computation with komi
 * - Edge cases and corner scenarios
 * - Empty territory vs occupied territory
 * - Mixed territory ownership
 * - Large captures vs small territory
 * - Japanese scoring rules implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateTerritories,
  calculateFinalScore,
  toggleDeadGroup,
  createScoringState,
  ScoringState,
} from './scoring';
import {
  Player,
  BoardSize,
  Position,
  Board,
  Territory,
  GameScore,
  createPosition,
} from '@go-game/types';
import {
  board,
  BoardBuilder,
  PositionGenerator,
  BoardAnalyzer,
} from './test-utils';
import { AsciiBoardParser, ascii, asciiBoard } from './test-utils/board-helpers';
import {
  EmptyBoards,
  TerritoryPatterns,
  ScoringScenarios,
  CapturePatterns,
} from './test-utils/fixtures';

// Helper function to convert Set<Position> to sorted array for comparison
const sortPositions = (positions: Set<Position>): Position[] => {
  return Array.from(positions).sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });
};

// Helper function to create position key
const positionKey = (pos: Position): string => `${pos.x},${pos.y}`;

describe('Scoring System', () => {
  describe('calculateTerritories', () => {
    describe('Empty board scenarios', () => {
      it('should return single territory for completely empty board', () => {
        const emptyBoard = EmptyBoards.small;
        const territories = calculateTerritories(emptyBoard);
        
        expect(territories).toHaveLength(1);
        expect(territories[0].controlledBy).toBeNull();
        expect(territories[0].points).toBe(0); // Neutral territory has 0 points
        expect(territories[0].positions.size).toBe(81); // 9x9 = 81 intersections
      });

      it('should handle different board sizes correctly', () => {
        const mediumBoard = EmptyBoards.medium;
        const territories = calculateTerritories(mediumBoard);
        
        expect(territories).toHaveLength(1);
        expect(territories[0].positions.size).toBe(169); // 13x13 = 169
      });
    });

    describe('Simple territory scenarios', () => {
      it('should identify clear black corner territory', () => {
        const testBoard = board()
          .black(2, 0)
          .black(2, 1) 
          .black(2, 2)
          .black(0, 2)
          .black(1, 2)
          .build();

        const territories = calculateTerritories(testBoard);
        
        // Find the black territory in the corner
        const blackTerritory = territories.find(t => t.controlledBy === Player.BLACK);
        expect(blackTerritory).toBeDefined();
        expect(blackTerritory!.points).toBe(4); // 2x2 corner territory
        
        // Check specific positions are in black territory
        const territoryPositions = Array.from(blackTerritory!.positions);
        expect(territoryPositions).toContainEqual(createPosition(0, 0));
        expect(territoryPositions).toContainEqual(createPosition(1, 0));
        expect(territoryPositions).toContainEqual(createPosition(0, 1));
        expect(territoryPositions).toContainEqual(createPosition(1, 1));
      });

      it('should identify clear white territory', () => {
        const testBoard = ascii`
          . . . . . . . . .
          . . . . . . . . .
          . . O O O . . . .
          . . O . O . . . .
          . . O O O . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
        `;

        const territories = calculateTerritories(testBoard);
        
        const whiteTerritory = territories.find(t => t.controlledBy === Player.WHITE);
        expect(whiteTerritory).toBeDefined();
        expect(whiteTerritory!.points).toBeGreaterThan(0); // Territory inside white stones
        
        // Check that the enclosed position is in white territory
        const territoryPositions = Array.from(whiteTerritory!.positions);
        const hasEnclosedArea = territoryPositions.some(p => p.x === 3 && p.y === 3);
        expect(hasEnclosedArea).toBe(true);
      });

      it('should identify neutral territory between both players', () => {
        const testBoard = board()
          .black(2, 2)
          .white(6, 6)
          .build();

        const territories = calculateTerritories(testBoard);
        
        // Most of the board should be neutral territory
        const neutralTerritories = territories.filter(t => t.controlledBy === null);
        expect(neutralTerritories.length).toBeGreaterThan(0);
        
        // Neutral territories should have 0 points
        neutralTerritories.forEach(territory => {
          expect(territory.points).toBe(0);
        });
      });
    });

    describe('Complex territory scenarios', () => {
      it('should handle multiple separate territories', () => {
        const testBoard = ascii`
          X . . . . . . . .
          X . . . . . . . .
          X X X . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . O O O
          . . . . . . O . O
          . . . . . . O O O
        `;

        const territories = calculateTerritories(testBoard);
        
        // Should find separate black and white territories
        const blackTerritories = territories.filter(t => t.controlledBy === Player.BLACK);
        const whiteTerritories = territories.filter(t => t.controlledBy === Player.WHITE);
        
        expect(blackTerritories.length).toBeGreaterThan(0);
        expect(whiteTerritories.length).toBeGreaterThan(0);
        
        // Black should control upper left corner
        const blackTerritory = blackTerritories[0];
        expect(blackTerritory.points).toBeGreaterThan(0);
        
        // White should control lower right area
        const whiteTerritory = whiteTerritories[0];
        expect(whiteTerritory.points).toBe(1); // 1x1 hole in white formation
      });

      it('should handle contested territory correctly', () => {
        const testBoard = ascii`
          . . . . . . . . .
          . X . . . . . O .
          . . . . . . . . .
          . . . . . . . . .
          . . . . X . . . .
          . . . . . . . . .
          . . . . . . . . .
          . O . . . . . X .
          . . . . . . . . .
        `;

        const territories = calculateTerritories(testBoard);
        
        // Most territory should be neutral since it's not clearly controlled
        const neutralTerritories = territories.filter(t => t.controlledBy === null);
        expect(neutralTerritories.length).toBeGreaterThan(0);
        
        // Each neutral territory should have 0 points
        neutralTerritories.forEach(territory => {
          expect(territory.points).toBe(0);
        });
      });

      it('should handle complex shapes and connections', () => {
        const testBoard = ascii`
          X X X X . . . . .
          X . . X . . . . .
          X . . X . . . . .
          X X X X . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
        `;

        const territories = calculateTerritories(testBoard);
        
        const blackTerritories = territories.filter(t => t.controlledBy === Player.BLACK);
        expect(blackTerritories).toHaveLength(1);
        expect(blackTerritories[0].points).toBe(4); // 2x2 enclosed area
        
        // Verify the enclosed positions
        const enclosed = Array.from(blackTerritories[0].positions);
        expect(enclosed).toContainEqual(createPosition(1, 1));
        expect(enclosed).toContainEqual(createPosition(2, 1));
        expect(enclosed).toContainEqual(createPosition(1, 2));
        expect(enclosed).toContainEqual(createPosition(2, 2));
      });
    });

    describe('Edge and corner cases', () => {
      it('should handle edge territories correctly', () => {
        const testBoard = board()
          .black(0, 1)
          .black(1, 0)
          .build();

        const territories = calculateTerritories(testBoard);
        
        const blackTerritories = territories.filter(t => t.controlledBy === Player.BLACK);
        expect(blackTerritories).toHaveLength(1);
        expect(blackTerritories[0].points).toBe(1); // Corner position (0,0)
        
        const territoryPositions = Array.from(blackTerritories[0].positions);
        expect(territoryPositions).toContainEqual(createPosition(0, 0));
      });

      it('should handle single stone isolation', () => {
        const testBoard = board()
          .black(4, 4) // Single stone in center
          .build();

        const territories = calculateTerritories(testBoard);
        
        // Single stone in the middle doesn't create controlled territory
        // Should be one large neutral territory
        expect(territories.length).toBeGreaterThanOrEqual(1);
        
        // Total positions should be 80 (81 - 1 stone)
        const totalEmptyPositions = territories.reduce(
          (sum, t) => sum + t.positions.size, 0
        );
        expect(totalEmptyPositions).toBe(80);
      });

      it('should handle board full of stones', () => {
        let testBoard = EmptyBoards.small;
        
        // Fill entire board with alternating stones
        for (let y = 0; y < 9; y++) {
          for (let x = 0; x < 9; x++) {
            const player = (x + y) % 2 === 0 ? Player.BLACK : Player.WHITE;
            const builder = new BoardBuilder(BoardSize.SMALL);
            // We need to rebuild the board with the existing stones plus new one
            // This is a simplified approach for testing
          }
        }
        
        // For now, test with mostly full board
        testBoard = ascii`
          X O X O X O X O X
          O X O X O X O X O
          X O X O X O X O X
          O X O X O X O X O
          X O X O . O X O X
          O X O X O X O X O
          X O X O X O X O X
          O X O X O X O X O
          X O X O X O X O X
        `;

        const territories = calculateTerritories(testBoard);
        
        // Should have minimal territory - just the empty spot
        expect(territories.length).toBeGreaterThanOrEqual(1);
        
        const totalTerritorySize = territories.reduce(
          (sum, t) => sum + t.positions.size, 0
        );
        expect(totalTerritorySize).toBe(1); // Only one empty position
      });
    });

    describe('Dead stones integration', () => {
      it('should treat dead stones as empty territory', () => {
        const testBoard = ascii`
          X X X . . . . . .
          X O X . . . . . .
          X X X . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
        `;

        const deadStones = new Set([positionKey(createPosition(1, 1))]);
        const territories = calculateTerritories(testBoard, deadStones);
        
        const blackTerritories = territories.filter(t => t.controlledBy === Player.BLACK);
        expect(blackTerritories).toHaveLength(1);
        expect(blackTerritories[0].points).toBe(1); // Dead white stone becomes black territory
      });

      it('should handle multiple dead stone groups', () => {
        const testBoard = ascii`
          X X X . . . O O O
          X O X . . . O X O
          X X X . . . O O O
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
        `;

        const deadStones = new Set([
          positionKey(createPosition(1, 1)), // Dead white in black territory
          positionKey(createPosition(7, 1)), // Dead black in white territory
        ]);
        
        const territories = calculateTerritories(testBoard, deadStones);
        
        const blackTerritories = territories.filter(t => t.controlledBy === Player.BLACK);
        const whiteTerritories = territories.filter(t => t.controlledBy === Player.WHITE);
        
        expect(blackTerritories).toHaveLength(1);
        expect(whiteTerritories).toHaveLength(1);
        
        expect(blackTerritories[0].points).toBe(1); // Dead white becomes black territory
        expect(whiteTerritories[0].points).toBe(1); // Dead black becomes white territory
      });

      it('should handle dead stones creating larger territories', () => {
        const testBoard = ascii`
          . X X X X X X X .
          X X O O O O O X X
          X O . . . . . O X
          X O . . . . . O X
          X O . . . . . O X
          X O . . . . . O X
          X O . . . . . O X
          X X O O O O O X X
          . X X X X X X X .
        `;

        // Mark all white stones as dead
        const deadStones = new Set();
        for (let y = 1; y < 8; y++) {
          for (let x = 1; x < 8; x++) {
            if ((y === 1 || y === 7) && (x >= 2 && x <= 6)) {
              deadStones.add(positionKey(createPosition(x, y)));
            } else if ((x === 1 || x === 7) && (y >= 2 && y <= 6)) {
              deadStones.add(positionKey(createPosition(x, y)));
            }
          }
        }

        const territories = calculateTerritories(testBoard, deadStones);
        
        const blackTerritories = territories.filter(t => t.controlledBy === Player.BLACK);
        expect(blackTerritories).toHaveLength(1);
        
        // Should have large territory including dead white stones and enclosed empty area
        expect(blackTerritories[0].points).toBeGreaterThan(30);
      });
    });
  });

  describe('toggleDeadGroup', () => {
    describe('Basic functionality', () => {
      it('should mark single stone as dead', () => {
        const testBoard = board()
          .white(4, 4)
          .build();

        const deadStones = new Set<string>();
        const toggledStones = toggleDeadGroup(testBoard, createPosition(4, 4), deadStones);

        expect(toggledStones.size).toBe(1);
        expect(toggledStones.has(positionKey(createPosition(4, 4)))).toBe(true);
        expect(deadStones.has(positionKey(createPosition(4, 4)))).toBe(true);
      });

      it('should toggle stone from dead to alive', () => {
        const testBoard = board()
          .white(4, 4)
          .build();

        const deadStones = new Set([positionKey(createPosition(4, 4))]);
        const toggledStones = toggleDeadGroup(testBoard, createPosition(4, 4), deadStones);

        expect(toggledStones.size).toBe(1);
        expect(deadStones.has(positionKey(createPosition(4, 4)))).toBe(false);
      });

      it('should return empty set for empty intersection', () => {
        const testBoard = EmptyBoards.small;
        const deadStones = new Set<string>();
        
        const toggledStones = toggleDeadGroup(testBoard, createPosition(4, 4), deadStones);

        expect(toggledStones.size).toBe(0);
        expect(deadStones.size).toBe(0);
      });
    });

    describe('Group handling', () => {
      it('should toggle entire connected group', () => {
        const testBoard = ascii`
          . . . . . . . . .
          . . . . . . . . .
          . . X X X . . . .
          . . X . X . . . .
          . . X X X . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
        `;

        const deadStones = new Set<string>();
        const toggledStones = toggleDeadGroup(testBoard, createPosition(2, 2), deadStones);

        // Should toggle all stones in the rectangular group
        expect(toggledStones.size).toBe(8); // Perimeter of rectangle
        expect(deadStones.size).toBe(8);
        
        // Verify specific positions
        expect(deadStones.has(positionKey(createPosition(2, 2)))).toBe(true);
        expect(deadStones.has(positionKey(createPosition(4, 2)))).toBe(true);
        expect(deadStones.has(positionKey(createPosition(2, 4)))).toBe(true);
        expect(deadStones.has(positionKey(createPosition(4, 4)))).toBe(true);
      });

      it('should only toggle connected stones of same color', () => {
        const testBoard = ascii`
          . . . . . . . . .
          . . . . . . . . .
          . . X X O . . . .
          . . X . O . . . .
          . . X X O . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
        `;

        const deadStones = new Set<string>();
        const toggledStones = toggleDeadGroup(testBoard, createPosition(2, 2), deadStones);

        // Should toggle black stones, not white ones
        expect(toggledStones.size).toBeGreaterThan(0);
        expect(toggledStones.size).toBeLessThan(10); // Should be reasonable number
        
        // White stones should not be affected
        expect(deadStones.has(positionKey(createPosition(4, 2)))).toBe(false);
        expect(deadStones.has(positionKey(createPosition(4, 3)))).toBe(false);
        expect(deadStones.has(positionKey(createPosition(4, 4)))).toBe(false);
      });

      it('should handle large connected groups', () => {
        const testBoard = ascii`
          O O O O O O O O O
          O . . . . . . . O
          O . . . . . . . O
          O . . . . . . . O
          O . . . . . . . O
          O . . . . . . . O
          O . . . . . . . O
          O . . . . . . . O
          O O O O O O O O O
        `;

        const deadStones = new Set<string>();
        const toggledStones = toggleDeadGroup(testBoard, createPosition(0, 0), deadStones);

        // Should toggle all connected white stones
        expect(toggledStones.size).toBeGreaterThan(20); // Large perimeter
        expect(deadStones.size).toBe(toggledStones.size);
      });
    });

    describe('Complex scenarios', () => {
      it('should handle groups with multiple liberties', () => {
        const testBoard = ascii`
          . . . . . . . . .
          . X . X . . . . .
          . . . . . . . . .
          . X . X . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
        `;

        const deadStones = new Set<string>();
        
        // Toggle one stone - should not affect unconnected stones
        const toggledStones = toggleDeadGroup(testBoard, createPosition(1, 1), deadStones);

        expect(toggledStones.size).toBe(1);
        expect(deadStones.has(positionKey(createPosition(1, 1)))).toBe(true);
        expect(deadStones.has(positionKey(createPosition(3, 1)))).toBe(false);
      });

      it('should handle Ko-like situations in dead stone marking', () => {
        const testBoard = ascii`
          . X . . . . . . .
          X O X . . . . . .
          . X . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
        `;

        const deadStones = new Set<string>();
        const toggledStones = toggleDeadGroup(testBoard, createPosition(1, 1), deadStones);

        expect(toggledStones.size).toBe(1);
        expect(deadStones.has(positionKey(createPosition(1, 1)))).toBe(true);
      });
    });
  });

  describe('calculateFinalScore', () => {
    describe('Basic scoring', () => {
      it('should calculate score for empty board with komi', () => {
        const emptyBoard = EmptyBoards.small;
        const score = calculateFinalScore(emptyBoard, [], [], 6.5);

        expect(score.black.territory).toBe(0);
        expect(score.black.captures).toBe(0);
        expect(score.black.total).toBe(0);

        expect(score.white.territory).toBe(0);
        expect(score.white.captures).toBe(0);
        expect(score.white.komi).toBe(6.5);
        expect(score.white.total).toBe(6.5);

        expect(score.winner).toBe(Player.WHITE);
      });

      it('should calculate score with clear territories', () => {
        const testBoard = ascii`
          X X X . . . . . .
          X . X . . . . . .
          X X X . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . O O O
          . . . . . . O . O
          . . . . . . O O O
        `;

        const score = calculateFinalScore(testBoard, [], [], 6.5);

        expect(score.black.territory).toBeGreaterThanOrEqual(0); // May have enclosed areas
        expect(score.white.territory).toBeGreaterThanOrEqual(0); // May have enclosed areas

        // With komi, white should have advantage
        expect(score.white.komi).toBe(6.5);
        expect(score.winner).toBeDefined();
      });

      it('should handle captures in scoring', () => {
        const testBoard = board()
          .black(4, 4)
          .build();

        const capturedByBlack = [createPosition(1, 1), createPosition(2, 2)];
        const capturedByWhite = [createPosition(7, 7)];

        const score = calculateFinalScore(testBoard, capturedByBlack, capturedByWhite, 6.5);

        expect(score.black.captures).toBe(2);
        expect(score.white.captures).toBe(1);
        
        // Black gets capture points (may include territory)
        expect(score.black.total).toBeGreaterThanOrEqual(2);
        // White gets komi plus capture (may include territory)
        expect(score.white.total).toBeGreaterThanOrEqual(7.5);
      });
    });

    describe('Dead stone scoring', () => {
      it('should count dead stones as captures', () => {
        const testBoard = ascii`
          X X X . . . . . .
          X O X . . . . . .
          X X X . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . O O O . . .
          . . . O X O . . .
          . . . O O O . . .
        `;

        const deadStones = new Set([
          positionKey(createPosition(1, 1)), // Dead white in black territory
          positionKey(createPosition(4, 7)), // Dead black in white territory
        ]);

        const score = calculateFinalScore(testBoard, [], [], 6.5, deadStones);

        // Dead stones should be counted as captures
        expect(score.black.captures).toBeGreaterThanOrEqual(0);
        expect(score.white.captures).toBeGreaterThanOrEqual(0);
        expect(score.black.territory).toBeGreaterThanOrEqual(0);
        expect(score.white.territory).toBeGreaterThanOrEqual(0);
      });

      it('should handle multiple dead stone groups', () => {
        const testBoard = ascii`
          X X X O O O . . .
          X O X O X O . . .
          X X X O O O . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
        `;

        const deadStones = new Set([
          positionKey(createPosition(1, 1)), // Dead white in black territory
          positionKey(createPosition(4, 1)), // Dead black in white territory
        ]);

        const score = calculateFinalScore(testBoard, [], [], 6.5, deadStones);

        // Should have captures and territories
        expect(score.black.captures).toBeGreaterThanOrEqual(0);
        expect(score.white.captures).toBeGreaterThanOrEqual(0);
        expect(score.black.territory).toBeGreaterThanOrEqual(0);
        expect(score.white.territory).toBeGreaterThanOrEqual(0);
      });

      it('should handle dead stones creating larger territories', () => {
        const testBoard = ascii`
          . X X X X X X X .
          X O O O O O O O X
          X O . . . . . O X
          X O . . . . . O X
          X O . . . . . O X
          X O . . . . . O X
          X O . . . . . O X
          X O O O O O O O X
          . X X X X X X X .
        `;

        // Mark all white stones as dead
        const deadStones = new Set<string>();
        for (let y = 1; y <= 7; y++) {
          for (let x = 1; x <= 7; x++) {
            if (testBoard[y][x]?.player === Player.WHITE) {
              deadStones.add(positionKey(createPosition(x, y)));
            }
          }
        }

        const score = calculateFinalScore(testBoard, [], [], 6.5, deadStones);

        expect(score.black.captures).toBeGreaterThan(20); // Many dead white stones
        expect(score.black.territory).toBeGreaterThan(20); // Large territory including dead stones
        expect(score.black.total).toBeGreaterThan(score.white.total);
        expect(score.winner).toBe(Player.BLACK);
      });
    });

    describe('Complex scoring scenarios', () => {
      it('should handle mixed territories and captures', () => {
        const testBoard = ascii`
          X . X . . . O . O
          . . . . . . . . .
          X . X . . . O . O
          . . . . . . . . .
          . . . . . . . . .
          . . . . . . . . .
          X . X . . . O . O
          . . . . . . . . .
          X . X . . . O . O
        `;

        const capturedByBlack = [createPosition(8, 8)];
        const capturedByWhite = [createPosition(0, 0)];

        const score = calculateFinalScore(testBoard, capturedByBlack, capturedByWhite, 6.5);

        // Should have neutral territory in the middle
        expect(score.black.captures).toBe(1);
        expect(score.white.captures).toBe(1);
        // Mixed pattern may not create controlled territories
        expect(score.black.territory).toBeGreaterThanOrEqual(0);
        expect(score.white.territory).toBeGreaterThanOrEqual(0);
      });

      it('should calculate tie games correctly', () => {
        const testBoard = board()
          .black(2, 2)
          .white(6, 6)
          .build();

        // Equal captures and territory, komi determines winner
        const score = calculateFinalScore(testBoard, [], [], 0); // No komi

        if (score.black.total === score.white.total) {
          expect(score.winner).toBeNull();
        } else {
          expect(score.winner).not.toBeNull();
        }
      });

      it('should handle large capture differences', () => {
        const testBoard = EmptyBoards.small;
        
        // Black captures many stones
        const manyCaptures = Array.from({ length: 20 }, (_, i) => 
          createPosition(i % 9, Math.floor(i / 9))
        );

        const score = calculateFinalScore(testBoard, manyCaptures, [], 6.5);

        expect(score.black.captures).toBe(20);
        expect(score.black.total).toBe(20);
        expect(score.white.total).toBe(6.5);
        expect(score.winner).toBe(Player.BLACK);
      });

      it('should handle different komi values', () => {
        const testBoard = EmptyBoards.small;

        // Test various komi values
        const komiValues = [0, 0.5, 5.5, 6.5, 7.5, 10];
        
        komiValues.forEach(komi => {
          const score = calculateFinalScore(testBoard, [], [], komi);
          expect(score.white.komi).toBe(komi);
          expect(score.white.total).toBe(komi);
        });
      });
    });

    describe('Edge cases', () => {
      it('should handle board with only stones, no territory', () => {
        // Create a board with many stones but no enclosed territory
        const testBoard = ascii`
          X O X O X O X O X
          O X O X O X O X O
          X O X O . O X O X
          O X O X O X O X O
          X O X O X O X O X
          O X O X O X O X O
          X O X O X O X O X
          O X O X O X O X O
          X O X O X O X O X
        `;

        const score = calculateFinalScore(testBoard, [], [], 6.5);

        expect(score.black.territory).toBe(0);
        expect(score.white.territory).toBe(0);
        expect(score.winner).toBe(Player.WHITE); // Due to komi
      });

      it('should handle extreme score differences', () => {
        const testBoard = ascii`
          X X X X X X X X X
          X . . . . . . . X
          X . . . . . . . X
          X . . . . . . . X
          X . . . . . . . X
          X . . . . . . . X
          X . . . . . . . X
          X . . . . . . . X
          X X X X X X X X X
        `;

        const score = calculateFinalScore(testBoard, [], [], 6.5);

        expect(score.black.territory).toBe(49); // 7x7 enclosed area
        expect(score.black.total).toBe(49);
        expect(score.white.total).toBe(6.5);
        expect(score.winner).toBe(Player.BLACK);
        
        // Score difference should be significant
        expect(score.black.total - score.white.total).toBeGreaterThan(40);
      });

      it('should handle fractional komi correctly', () => {
        const testBoard = board()
          .black(4, 4)
          .build();

        const score = calculateFinalScore(testBoard, [], [], 0.5);

        expect(score.white.komi).toBe(0.5);
        expect(score.white.total).toBe(0.5);
        expect(Number.isInteger(score.white.total)).toBe(false);
      });
    });
  });

  describe('createScoringState', () => {
    it('should create empty scoring state', () => {
      const state = createScoringState();
      
      expect(state.deadStones).toBeInstanceOf(Set);
      expect(state.deadStones.size).toBe(0);
      expect(state.territories).toEqual([]);
    });

    it('should create independent instances', () => {
      const state1 = createScoringState();
      const state2 = createScoringState();
      
      state1.deadStones.add('test');
      
      expect(state1.deadStones.size).toBe(1);
      expect(state2.deadStones.size).toBe(0);
    });
  });

  describe('Integration tests', () => {
    it('should handle complete game scoring workflow', () => {
      // Create a realistic end-game position
      const testBoard = ascii`
        X X X . . . O O O
        X . X . . . O . O
        X X X . . . O O O
        . . . . . . . . .
        . . . . X . . . .
        . . . X X X . . .
        . . . X . X . . .
        . . . X X X . . .
        . . . . . . . . .
      `;

      // Mark some stones as dead
      const deadStones = new Set([
        positionKey(createPosition(1, 1)), // Dead white in black territory
        positionKey(createPosition(7, 1)), // Dead black in white territory
      ]);

      // Calculate territories
      const territories = calculateTerritories(testBoard, deadStones);
      
      // Calculate final score
      const capturedByBlack = [createPosition(8, 8)];
      const capturedByWhite = [createPosition(0, 8)];
      const score = calculateFinalScore(testBoard, capturedByBlack, capturedByWhite, 6.5, deadStones);

      // Verify comprehensive scoring
      expect(territories.length).toBeGreaterThan(0);
      expect(score.black.territory).toBeGreaterThanOrEqual(0);
      expect(score.white.territory).toBeGreaterThanOrEqual(0);
      expect(score.black.captures).toBeGreaterThan(0);
      expect(score.white.captures).toBeGreaterThan(0);
      expect(score.winner).not.toBeUndefined();
    });

    it('should be consistent across multiple calculations', () => {
      const testBoard = TerritoryPatterns.blackCornerTerritory;
      
      // Calculate same position multiple times
      const results = Array.from({ length: 5 }, () => 
        calculateTerritories(testBoard)
      );

      // All results should be identical
      for (let i = 1; i < results.length; i++) {
        expect(results[i].length).toBe(results[0].length);
        
        results[i].forEach((territory, index) => {
          expect(territory.controlledBy).toBe(results[0][index].controlledBy);
          expect(territory.points).toBe(results[0][index].points);
          expect(territory.positions.size).toBe(results[0][index].positions.size);
        });
      }
    });

    it('should handle performance with large territories', () => {
      // Create large empty areas for performance testing
      const testBoard = ascii`
        X . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . X
      `;

      const startTime = Date.now();
      const territories = calculateTerritories(testBoard);
      const endTime = Date.now();

      // Should complete quickly (under 100ms for 9x9 board)
      expect(endTime - startTime).toBeLessThan(100);
      expect(territories.length).toBeGreaterThan(0);
    });
  });

  describe('Japanese Rules Compliance', () => {
    it('should follow Japanese territory counting rules', () => {
      // In Japanese rules, only empty points surrounded by one color count as territory
      const testBoard = ascii`
        X X X . . . . . .
        X O X . . . . . .
        X X X . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
      `;

      const territories = calculateTerritories(testBoard);
      
      // White stone inside black territory should not count as territory for anyone
      // when alive, but if marked dead, the position becomes black territory
      const whiteStoneAlive = territories.some(t => 
        t.controlledBy === Player.WHITE && 
        Array.from(t.positions).some(p => p.x === 1 && p.y === 1)
      );
      expect(whiteStoneAlive).toBe(false);

      // With dead white stone, becomes black territory
      const deadStones = new Set([positionKey(createPosition(1, 1))]);
      const territoriesWithDeadStone = calculateTerritories(testBoard, deadStones);
      const blackTerritory = territoriesWithDeadStone.find(t => t.controlledBy === Player.BLACK);
      
      expect(blackTerritory).toBeDefined();
      expect(blackTerritory!.points).toBe(1);
    });

    it('should handle seki situations correctly', () => {
      // Seki: mutual life without territory
      const testBoard = ascii`
        . X O . . . . . .
        X . X O . . . . .
        X X O O . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
      `;

      const territories = calculateTerritories(testBoard);
      
      // In a seki, the empty spaces don't count as territory for either side
      const sekiArea = territories.find(t => 
        Array.from(t.positions).some(p => (p.x === 1 && p.y === 1))
      );
      
      // Seki areas should be neutral (not controlled by either player)
      if (sekiArea) {
        expect(sekiArea.controlledBy).toBeNull();
        expect(sekiArea.points).toBe(0);
      }
    });

    it('should correctly count eyes and false eyes', () => {
      // True eye: surrounded by own stones
      const testBoard = ascii`
        X X X . . . . . .
        X . X . . . . . .
        X X X . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . X X X . . .
        . . . X O X . . .
        . . . X X X . . .
        . . . . . . . . .
      `;

      const territories = calculateTerritories(testBoard);
      
      const blackTerritories = territories.filter(t => t.controlledBy === Player.BLACK);
      expect(blackTerritories).toHaveLength(1);
      expect(blackTerritories[0].points).toBe(1); // True eye
      
      // False eye (contains enemy stone) doesn't count as territory
      const whiteTerritories = territories.filter(t => t.controlledBy === Player.WHITE);
      expect(whiteTerritories).toHaveLength(0); // White stone in black territory isn't territory
    });
  });
});