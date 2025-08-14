/**
 * Test Utils Verification
 * 
 * Basic tests to verify our test utilities are working correctly
 */

import { describe, it, expect } from 'vitest';
import { Player, BoardSize } from '@go-game/types';
import { 
  board, 
  moveSequence, 
  PositionGenerator,
  GoMatchers,
  TestSetup 
} from './index';
import { SimplePatterns, CapturePatterns } from './fixtures';
import { AsciiBoardParser } from './board-helpers';

describe('GO Game Test Utilities', () => {
  describe('BoardBuilder', () => {
    it('should create boards with stones', () => {
      const testBoard = board(BoardSize.SMALL)
        .black(4, 4)
        .white(2, 2)
        .build();
      
      expect(GoMatchers.hasStone(testBoard, { x: 4, y: 4 }, Player.BLACK)).toBe(true);
      expect(GoMatchers.hasStone(testBoard, { x: 2, y: 2 }, Player.WHITE)).toBe(true);
      expect(GoMatchers.isEmpty(testBoard, { x: 0, y: 0 })).toBe(true);
    });

    it('should create boards with patterns', () => {
      const patternBoard = board(BoardSize.SMALL)
        .pattern({
          black: [[1, 1], [2, 2]],
          white: [[6, 6], [7, 7]]
        })
        .build();
      
      expect(GoMatchers.hasStone(patternBoard, { x: 1, y: 1 }, Player.BLACK)).toBe(true);
      expect(GoMatchers.hasStone(patternBoard, { x: 2, y: 2 }, Player.BLACK)).toBe(true);
      expect(GoMatchers.hasStone(patternBoard, { x: 6, y: 6 }, Player.WHITE)).toBe(true);
      expect(GoMatchers.hasStone(patternBoard, { x: 7, y: 7 }, Player.WHITE)).toBe(true);
    });
  });

  describe('PositionGenerator', () => {
    it('should generate corner positions', () => {
      const corners = PositionGenerator.corners(BoardSize.SMALL);
      
      expect(corners).toHaveLength(4);
      expect(corners).toEqual(expect.arrayContaining([
        { x: 0, y: 0 },
        { x: 8, y: 0 },
        { x: 0, y: 8 },
        { x: 8, y: 8 }
      ]));
    });

    it('should generate center positions', () => {
      const center = PositionGenerator.center(BoardSize.SMALL, 1);
      
      expect(center).toHaveLength(9); // 3x3 area around center
      expect(center).toEqual(expect.arrayContaining([
        { x: 4, y: 4 } // Center of 9x9 board
      ]));
    });
  });

  describe('MoveSequence', () => {
    it('should build move sequences', () => {
      const engine = TestSetup.basicGame();
      
      const results = moveSequence()
        .place(Player.BLACK, 4, 4)
        .place(Player.WHITE, 2, 2)
        .pass(Player.BLACK)
        .executeOn(engine);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Fixtures', () => {
    it('should provide predefined patterns', () => {
      const centerStone = SimplePatterns.centerStone;
      expect(GoMatchers.hasStone(centerStone, { x: 4, y: 4 }, Player.BLACK)).toBe(true);
      
      const capturePattern = CapturePatterns.simpleCapture;
      expect(GoMatchers.hasStone(capturePattern, { x: 0, y: 0 }, Player.WHITE)).toBe(true);
      expect(GoMatchers.hasStone(capturePattern, { x: 0, y: 1 }, Player.BLACK)).toBe(true);
    });
  });

  describe('AsciiBoardParser', () => {
    it('should parse ASCII board strings', () => {
      const asciiString = `
        . . . X . . . . .
        . . . . . . . . .
        . . . . O . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
        . . . . . . . . .
      `;
      
      const parsedBoard = AsciiBoardParser.parse(asciiString, BoardSize.SMALL);
      
      expect(GoMatchers.hasStone(parsedBoard, { x: 3, y: 0 }, Player.BLACK)).toBe(true);
      expect(GoMatchers.hasStone(parsedBoard, { x: 4, y: 2 }, Player.WHITE)).toBe(true);
      expect(GoMatchers.isEmpty(parsedBoard, { x: 0, y: 0 })).toBe(true);
    });

    it('should convert board to ASCII string', () => {
      const testBoard = board(BoardSize.SMALL)
        .black(4, 4)
        .white(2, 2)
        .build();
      
      const asciiString = AsciiBoardParser.stringify(testBoard);
      
      expect(asciiString).toContain('X'); // Black stone
      expect(asciiString).toContain('O'); // White stone
      expect(asciiString).toContain('.'); // Empty positions
    });
  });

  describe('GoMatchers', () => {
    it('should validate stone positions', () => {
      const testBoard = board(BoardSize.SMALL)
        .black(4, 4)
        .white(2, 2)
        .build();
      
      expect(GoMatchers.hasStone(testBoard, { x: 4, y: 4 }, Player.BLACK)).toBe(true);
      expect(GoMatchers.hasStone(testBoard, { x: 4, y: 4 }, Player.WHITE)).toBe(false);
      expect(GoMatchers.isEmpty(testBoard, { x: 0, y: 0 })).toBe(true);
      expect(GoMatchers.isEmpty(testBoard, { x: 4, y: 4 })).toBe(false);
    });
  });
});
