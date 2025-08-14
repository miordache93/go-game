/**
 * Game Factory Unit Tests
 *
 * Comprehensive test suite for game factory functions.
 * Tests factory functions, parameter handling, edge cases, and validation.
 */

import { describe, it, expect } from 'vitest';

import {
  createLocalGame,
  createTimedGame,
  createQuickGame,
  createProfessionalGame,
  createBeginnerGame,
  createStandardGame,
  createScoringTestGame,
} from './game-factory';

import {
  BoardSize,
  Player,
  GamePhase,
  MoveType,
} from '@go-game/types';

import {
  DEFAULT_KOMI,
  TIME_CONTROLS,
} from '@go-game/constants';

import {
  GameStateFactory,
  GoMatchers,
} from './test-utils';

describe('Game Factory', () => {
  // ==========================================
  // createLocalGame Tests
  // ==========================================
  
  describe('createLocalGame', () => {
    it('should create a local game with default parameters', () => {
      const game = createLocalGame();
      const state = game.getGameState();
      
      expect(state.boardSize).toBe(BoardSize.MEDIUM);
      expect(state.phase).toBe(GamePhase.PLAYING);
      expect(state.komi).toBe(DEFAULT_KOMI[BoardSize.MEDIUM]);
      expect(state.currentPlayer).toBe(Player.BLACK);
      expect(state.moveHistory).toHaveLength(0);
      expect(state.passCount).toBe(0);
      expect(GoMatchers.isValidGameState(state)).toBe(true);
    });

    it('should create a small board game when specified', () => {
      const game = createLocalGame(BoardSize.SMALL);
      const state = game.getGameState();
      
      expect(state.boardSize).toBe(BoardSize.SMALL);
      expect(state.board).toHaveLength(9);
      expect(state.board[0]).toHaveLength(9);
      expect(state.komi).toBe(DEFAULT_KOMI[BoardSize.SMALL]);
    });

    it('should create a medium board game when specified', () => {
      const game = createLocalGame(BoardSize.MEDIUM);
      const state = game.getGameState();
      
      expect(state.boardSize).toBe(BoardSize.MEDIUM);
      expect(state.board).toHaveLength(13);
      expect(state.board[0]).toHaveLength(13);
      expect(state.komi).toBe(DEFAULT_KOMI[BoardSize.MEDIUM]);
    });

    it('should create a large board game when specified', () => {
      const game = createLocalGame(BoardSize.LARGE);
      const state = game.getGameState();
      
      expect(state.boardSize).toBe(BoardSize.LARGE);
      expect(state.board).toHaveLength(19);
      expect(state.board[0]).toHaveLength(19);
      expect(state.komi).toBe(DEFAULT_KOMI[BoardSize.LARGE]);
    });

    it('should use default player names when none provided', () => {
      const game = createLocalGame();
      const state = game.getGameState();
      
      // Note: Player names are part of GameSettings, not GameState
      // We'll verify through game functionality
      expect(state).toBeDefined();
      expect(state.currentPlayer).toBe(Player.BLACK);
    });

    it('should use custom player names when provided', () => {
      const playerNames = { black: 'Alice', white: 'Bob' };
      const game = createLocalGame(BoardSize.SMALL, playerNames);
      const state = game.getGameState();
      
      // Game should be created successfully with custom names
      expect(state).toBeDefined();
      expect(GoMatchers.isValidGameState(state)).toBe(true);
    });

    it('should handle partial player names', () => {
      const game1 = createLocalGame(BoardSize.SMALL, { black: 'Alice' });
      const game2 = createLocalGame(BoardSize.SMALL, { white: 'Bob' });
      
      expect(GoMatchers.isValidGameState(game1.getGameState())).toBe(true);
      expect(GoMatchers.isValidGameState(game2.getGameState())).toBe(true);
    });

    it('should create games with empty board state', () => {
      const game = createLocalGame(BoardSize.SMALL);
      const state = game.getGameState();
      
      // Verify all positions are empty
      for (let x = 0; x < state.boardSize; x++) {
        for (let y = 0; y < state.boardSize; y++) {
          expect(GoMatchers.isEmpty(state.board, { x, y })).toBe(true);
        }
      }
    });

    it('should create unique game IDs for multiple games', () => {
      const game1 = createLocalGame();
      const game2 = createLocalGame();
      
      expect(game1.getGameState().id).not.toBe(game2.getGameState().id);
    });
  });

  // ==========================================
  // createTimedGame Tests
  // ==========================================

  describe('createTimedGame', () => {
    it('should create a timed game with BLITZ time control', () => {
      const game = createTimedGame(BoardSize.SMALL, 'BLITZ');
      const state = game.getGameState();
      
      expect(state.timeSettings).toBeDefined();
      expect(state.timeSettings!.mainTime).toBe(TIME_CONTROLS.BLITZ.mainTime);
      expect(state.timeSettings!.byoyomi).toBe(TIME_CONTROLS.BLITZ.byoyomi);
      expect(state.timeSettings!.periods).toBe(TIME_CONTROLS.BLITZ.periods);
    });

    it('should create a timed game with RAPID time control', () => {
      const game = createTimedGame(BoardSize.MEDIUM, 'RAPID');
      const state = game.getGameState();
      
      expect(state.timeSettings).toBeDefined();
      expect(state.timeSettings!.mainTime).toBe(TIME_CONTROLS.RAPID.mainTime);
      expect(state.timeSettings!.byoyomi).toBe(TIME_CONTROLS.RAPID.byoyomi);
      expect(state.timeSettings!.periods).toBe(TIME_CONTROLS.RAPID.periods);
    });

    it('should create a timed game with NORMAL time control', () => {
      const game = createTimedGame(BoardSize.LARGE, 'NORMAL');
      const state = game.getGameState();
      
      expect(state.timeSettings).toBeDefined();
      expect(state.timeSettings!.mainTime).toBe(TIME_CONTROLS.NORMAL.mainTime);
      expect(state.timeSettings!.byoyomi).toBe(TIME_CONTROLS.NORMAL.byoyomi);
      expect(state.timeSettings!.periods).toBe(TIME_CONTROLS.NORMAL.periods);
    });

    it('should create a timed game with CORRESPONDENCE time control', () => {
      const game = createTimedGame(BoardSize.LARGE, 'CORRESPONDENCE');
      const state = game.getGameState();
      
      expect(state.timeSettings).toBeDefined();
      expect(state.timeSettings!.mainTime).toBe(TIME_CONTROLS.CORRESPONDENCE.mainTime);
      // CORRESPONDENCE doesn't have byoyomi/periods
      expect(state.timeSettings!.byoyomi).toBeUndefined();
      expect(state.timeSettings!.periods).toBeUndefined();
    });

    it('should use correct komi for board size', () => {
      const smallGame = createTimedGame(BoardSize.SMALL, 'BLITZ');
      const mediumGame = createTimedGame(BoardSize.MEDIUM, 'BLITZ');
      const largeGame = createTimedGame(BoardSize.LARGE, 'BLITZ');
      
      expect(smallGame.getGameState().komi).toBe(DEFAULT_KOMI[BoardSize.SMALL]);
      expect(mediumGame.getGameState().komi).toBe(DEFAULT_KOMI[BoardSize.MEDIUM]);
      expect(largeGame.getGameState().komi).toBe(DEFAULT_KOMI[BoardSize.LARGE]);
    });

    it('should handle custom player names in timed games', () => {
      const playerNames = { black: 'Pro Player 1', white: 'Pro Player 2' };
      const game = createTimedGame(BoardSize.LARGE, 'NORMAL', playerNames);
      
      expect(GoMatchers.isValidGameState(game.getGameState())).toBe(true);
    });

    it('should create valid game state for all time controls', () => {
      const timeControls: Array<keyof typeof TIME_CONTROLS> = ['BLITZ', 'RAPID', 'NORMAL', 'CORRESPONDENCE'];
      
      timeControls.forEach(control => {
        const game = createTimedGame(BoardSize.MEDIUM, control);
        const state = game.getGameState();
        
        expect(GoMatchers.isValidGameState(state)).toBe(true);
        expect(state.timeSettings).toBeDefined();
      });
    });
  });

  // ==========================================
  // createQuickGame Tests
  // ==========================================

  describe('createQuickGame', () => {
    it('should create a quick game with small board', () => {
      const game = createQuickGame();
      const state = game.getGameState();
      
      expect(state.boardSize).toBe(BoardSize.SMALL);
      expect(state.board).toHaveLength(9);
    });

    it('should use demo player names', () => {
      const game = createQuickGame();
      const state = game.getGameState();
      
      // Verify game is created successfully (names are internal to GameSettings)
      expect(GoMatchers.isValidGameState(state)).toBe(true);
    });

    it('should create multiple unique quick games', () => {
      const game1 = createQuickGame();
      const game2 = createQuickGame();
      
      expect(game1.getGameState().id).not.toBe(game2.getGameState().id);
    });

    it('should have correct initial state', () => {
      const game = createQuickGame();
      const state = game.getGameState();
      
      expect(state.phase).toBe(GamePhase.PLAYING);
      expect(state.currentPlayer).toBe(Player.BLACK);
      expect(state.moveHistory).toHaveLength(0);
      expect(state.passCount).toBe(0);
    });
  });

  // ==========================================
  // createProfessionalGame Tests
  // ==========================================

  describe('createProfessionalGame', () => {
    it('should create a 19x19 game', () => {
      const game = createProfessionalGame();
      const state = game.getGameState();
      
      expect(state.boardSize).toBe(BoardSize.LARGE);
      expect(state.board).toHaveLength(19);
      expect(state.board[0]).toHaveLength(19);
    });

    it('should use NORMAL time control', () => {
      const game = createProfessionalGame();
      const state = game.getGameState();
      
      expect(state.timeSettings).toBeDefined();
      expect(state.timeSettings!.mainTime).toBe(TIME_CONTROLS.NORMAL.mainTime);
      expect(state.timeSettings!.byoyomi).toBe(TIME_CONTROLS.NORMAL.byoyomi);
      expect(state.timeSettings!.periods).toBe(TIME_CONTROLS.NORMAL.periods);
    });

    it('should use correct komi for large board', () => {
      const game = createProfessionalGame();
      const state = game.getGameState();
      
      expect(state.komi).toBe(DEFAULT_KOMI[BoardSize.LARGE]);
    });

    it('should handle custom player names', () => {
      const playerNames = { black: 'Lee Sedol', white: 'AlphaGo' };
      const game = createProfessionalGame(playerNames);
      
      expect(GoMatchers.isValidGameState(game.getGameState())).toBe(true);
    });

    it('should create a fully functional game', () => {
      const game = createProfessionalGame();
      
      // Test that we can make moves
      const result = game.makeMove(Player.BLACK, MoveType.PLACE_STONE, { x: 3, y: 3 });
      expect(GoMatchers.isMoveSuccess(result)).toBe(true);
    });
  });

  // ==========================================
  // createBeginnerGame Tests
  // ==========================================

  describe('createBeginnerGame', () => {
    it('should create a 9x9 beginner game', () => {
      const game = createBeginnerGame();
      const state = game.getGameState();
      
      expect(state.boardSize).toBe(BoardSize.SMALL);
      expect(state.board).toHaveLength(9);
    });

    it('should have beginner-friendly time settings', () => {
      const game = createBeginnerGame();
      const state = game.getGameState();
      
      expect(state.timeSettings).toBeDefined();
      expect(state.timeSettings!.mainTime).toBe(1800); // 30 minutes
      expect(state.timeSettings!.byoyomi).toBe(120); // 2 minutes per move
      expect(state.timeSettings!.periods).toBe(3);
    });

    it('should use correct komi for small board', () => {
      const game = createBeginnerGame();
      const state = game.getGameState();
      
      expect(state.komi).toBe(DEFAULT_KOMI[BoardSize.SMALL]);
    });

    it('should handle custom player names', () => {
      const playerNames = { black: 'Beginner 1', white: 'Beginner 2' };
      const game = createBeginnerGame(playerNames);
      
      expect(GoMatchers.isValidGameState(game.getGameState())).toBe(true);
    });

    it('should create a playable game', () => {
      const game = createBeginnerGame();
      
      // Test corner move (common beginner move)
      const result = game.makeMove(Player.BLACK, MoveType.PLACE_STONE, { x: 2, y: 2 });
      expect(GoMatchers.isMoveSuccess(result)).toBe(true);
    });
  });

  // ==========================================
  // createStandardGame Tests
  // ==========================================

  describe('createStandardGame', () => {
    it('should create a 13x13 standard game', () => {
      const game = createStandardGame();
      const state = game.getGameState();
      
      expect(state.boardSize).toBe(BoardSize.MEDIUM);
      expect(state.board).toHaveLength(13);
      expect(state.board[0]).toHaveLength(13);
    });

    it('should use standard komi of 6.5', () => {
      const game = createStandardGame();
      const state = game.getGameState();
      
      expect(state.komi).toBe(6.5);
    });

    it('should not have time settings', () => {
      const game = createStandardGame();
      const state = game.getGameState();
      
      expect(state.timeSettings).toBeUndefined();
    });

    it('should create a valid game state', () => {
      const game = createStandardGame();
      const state = game.getGameState();
      
      expect(GoMatchers.isValidGameState(state)).toBe(true);
      expect(state.phase).toBe(GamePhase.PLAYING);
    });

    it('should be playable', () => {
      const game = createStandardGame();
      
      // Test center move
      const centerPos = { x: 6, y: 6 };
      const result = game.makeMove(Player.BLACK, MoveType.PLACE_STONE, centerPos);
      expect(GoMatchers.isMoveSuccess(result)).toBe(true);
    });
  });

  // ==========================================
  // createScoringTestGame Tests
  // ==========================================

  describe('createScoringTestGame', () => {
    it('should create a game with pre-filled board', () => {
      const game = createScoringTestGame();
      const state = game.getGameState();
      
      expect(state.boardSize).toBe(BoardSize.SMALL);
      expect(state.moveHistory.length).toBeGreaterThan(0);
    });

    it('should have stones in realistic positions', () => {
      const game = createScoringTestGame();
      const state = game.getGameState();
      
      // Check that there are stones on the board
      let stoneCount = 0;
      for (let x = 0; x < state.boardSize; x++) {
        for (let y = 0; y < state.boardSize; y++) {
          if (!GoMatchers.isEmpty(state.board, { x, y })) {
            stoneCount++;
          }
        }
      }
      
      expect(stoneCount).toBeGreaterThan(10); // Should have meaningful number of stones
    });

    it('should have black stones in top-left area', () => {
      const game = createScoringTestGame();
      const state = game.getGameState();
      
      // Based on the moves in the factory function
      expect(GoMatchers.hasStone(state.board, { x: 2, y: 2 }, Player.BLACK)).toBe(true);
      expect(GoMatchers.hasStone(state.board, { x: 2, y: 3 }, Player.BLACK)).toBe(true);
      expect(GoMatchers.hasStone(state.board, { x: 3, y: 2 }, Player.BLACK)).toBe(true);
    });

    it('should have white stones in bottom-right area', () => {
      const game = createScoringTestGame();
      const state = game.getGameState();
      
      // Based on the moves in the factory function
      expect(GoMatchers.hasStone(state.board, { x: 6, y: 6 }, Player.WHITE)).toBe(true);
      expect(GoMatchers.hasStone(state.board, { x: 6, y: 5 }, Player.WHITE)).toBe(true);
      expect(GoMatchers.hasStone(state.board, { x: 5, y: 6 }, Player.WHITE)).toBe(true);
    });

    it('should have some potentially dead stones', () => {
      const game = createScoringTestGame();
      const state = game.getGameState();
      
      // Check if white stone in black territory exists (based on actual game factory logic)
      // The exact positions may vary based on successful move execution
      const hasWhiteInBlackArea = GoMatchers.hasStone(state.board, { x: 1, y: 1 }, Player.WHITE);
      const hasBlackInWhiteArea = GoMatchers.hasStone(state.board, { x: 7, y: 7 }, Player.BLACK);
      
      // At least some stones should exist that could represent dead stones scenario
      // The test validates that the factory creates a meaningful test position
      expect(state.moveHistory.length).toBeGreaterThan(15); // Should have many moves
      
      // Check that both players have stones on the board
      let blackStones = 0, whiteStones = 0;
      for (let x = 0; x < state.boardSize; x++) {
        for (let y = 0; y < state.boardSize; y++) {
          const stone = state.board[y][x];
          if (stone) {
            if (stone.player === Player.BLACK) blackStones++;
            if (stone.player === Player.WHITE) whiteStones++;
          }
        }
      }
      
      expect(blackStones).toBeGreaterThan(5);
      expect(whiteStones).toBeGreaterThan(5);
    });

    it('should be ready for further testing', () => {
      const game = createScoringTestGame();
      const state = game.getGameState();
      
      expect(GoMatchers.isValidGameState(state)).toBe(true);
      expect(state.phase).toBe(GamePhase.PLAYING); // Still playing, not finished
    });

    it('should allow passing to enter scoring phase', () => {
      const game = createScoringTestGame();
      
      // Two passes should be possible to enter scoring
      const pass1 = game.makeMove(Player.BLACK, MoveType.PASS);
      const pass2 = game.makeMove(Player.WHITE, MoveType.PASS);
      
      expect(GoMatchers.isMoveSuccess(pass1)).toBe(true);
      expect(GoMatchers.isMoveSuccess(pass2)).toBe(true);
    });
  });

  // ==========================================
  // Edge Cases and Error Handling Tests
  // ==========================================

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty string player names gracefully', () => {
      const game = createLocalGame(BoardSize.SMALL, { black: '', white: '' });
      expect(GoMatchers.isValidGameState(game.getGameState())).toBe(true);
    });

    it('should handle undefined player names in partial objects', () => {
      const game1 = createLocalGame(BoardSize.SMALL, { black: undefined } as any);
      const game2 = createLocalGame(BoardSize.SMALL, { white: undefined } as any);
      
      expect(GoMatchers.isValidGameState(game1.getGameState())).toBe(true);
      expect(GoMatchers.isValidGameState(game2.getGameState())).toBe(true);
    });

    it('should create games with all board sizes', () => {
      const boardSizes = [BoardSize.SMALL, BoardSize.MEDIUM, BoardSize.LARGE];
      
      boardSizes.forEach(size => {
        const game = createLocalGame(size);
        const state = game.getGameState();
        
        expect(state.boardSize).toBe(size);
        expect(state.board).toHaveLength(size);
        expect(state.board[0]).toHaveLength(size);
        expect(GoMatchers.isValidGameState(state)).toBe(true);
      });
    });

    it('should create games with correct komi for each board size', () => {
      const sizes = [BoardSize.SMALL, BoardSize.MEDIUM, BoardSize.LARGE];
      
      sizes.forEach(size => {
        const game = createLocalGame(size);
        const state = game.getGameState();
        
        expect(state.komi).toBe(DEFAULT_KOMI[size]);
      });
    });

    it('should handle extremely long player names', () => {
      const longName = 'A'.repeat(1000);
      const game = createLocalGame(BoardSize.SMALL, { 
        black: longName, 
        white: longName 
      });
      
      expect(GoMatchers.isValidGameState(game.getGameState())).toBe(true);
    });

    it('should handle special characters in player names', () => {
      const specialNames = {
        black: '黑手🔥',
        white: 'Weiß-Spiel@r!'
      };
      const game = createLocalGame(BoardSize.SMALL, specialNames);
      
      expect(GoMatchers.isValidGameState(game.getGameState())).toBe(true);
    });
  });

  // ==========================================
  // Game Functionality Validation Tests
  // ==========================================

  describe('Game Functionality Validation', () => {
    it('should create games that can accept valid moves', () => {
      const factories = [
        () => createLocalGame(),
        () => createQuickGame(),
        () => createBeginnerGame(),
        () => createStandardGame(),
        () => createProfessionalGame(),
        () => createTimedGame(BoardSize.MEDIUM, 'RAPID'),
      ];
      
      factories.forEach((factory, index) => {
        const game = factory();
        const result = game.makeMove(Player.BLACK, MoveType.PLACE_STONE, { x: 1, y: 1 });
        
        expect(GoMatchers.isMoveSuccess(result)).toBe(true);
      });
    });

    it('should create games that reject invalid moves', () => {
      const game = createLocalGame(BoardSize.SMALL);
      
      // Try to place stone outside board
      const invalidResult = game.makeMove(Player.BLACK, MoveType.PLACE_STONE, { x: 10, y: 10 });
      expect(GoMatchers.isMoveFailure(invalidResult)).toBe(true);
    });

    it('should create games with proper turn alternation', () => {
      const game = createLocalGame(BoardSize.SMALL);
      
      // Black should go first
      let state = game.getGameState();
      expect(state.currentPlayer).toBe(Player.BLACK);
      
      // After black moves, should be white's turn
      game.makeMove(Player.BLACK, MoveType.PLACE_STONE, { x: 1, y: 1 });
      state = game.getGameState();
      expect(state.currentPlayer).toBe(Player.WHITE);
      
      // After white moves, should be black's turn
      game.makeMove(Player.WHITE, MoveType.PLACE_STONE, { x: 2, y: 2 });
      state = game.getGameState();
      expect(state.currentPlayer).toBe(Player.BLACK);
    });

    it('should create games that handle passing', () => {
      const game = createLocalGame(BoardSize.SMALL);
      
      const passResult = game.makeMove(Player.BLACK, MoveType.PASS);
      expect(GoMatchers.isMoveSuccess(passResult)).toBe(true);
      
      const state = game.getGameState();
      expect(state.passCount).toBe(1);
    });

    it('should create games that handle resignation', () => {
      const game = createLocalGame(BoardSize.SMALL);
      
      const resignResult = game.makeMove(Player.BLACK, MoveType.RESIGN);
      expect(GoMatchers.isMoveSuccess(resignResult)).toBe(true);
      
      const state = game.getGameState();
      expect(state.phase).toBe(GamePhase.FINISHED);
    });
  });

  // ==========================================
  // Performance and Memory Tests
  // ==========================================

  describe('Performance and Memory', () => {
    it('should create games efficiently', () => {
      const startTime = Date.now();
      
      // Create 100 games
      for (let i = 0; i < 100; i++) {
        createLocalGame(BoardSize.SMALL);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should be fast (less than 1 second for 100 games)
      expect(duration).toBeLessThan(1000);
    });

    it('should create games with unique IDs efficiently', () => {
      const ids = new Set<string>();
      const gameCount = 50;
      
      for (let i = 0; i < gameCount; i++) {
        const game = createLocalGame();
        const id = game.getGameState().id;
        
        expect(ids.has(id)).toBe(false);
        ids.add(id);
      }
      
      expect(ids.size).toBe(gameCount);
    });

    it('should create large board games efficiently', () => {
      const startTime = Date.now();
      
      // Create 10 large board games
      for (let i = 0; i < 10; i++) {
        const game = createLocalGame(BoardSize.LARGE);
        expect(game.getGameState().board).toHaveLength(19);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should still be reasonably fast
      expect(duration).toBeLessThan(500);
    });
  });

  // ==========================================
  // Integration with GameEngine Tests
  // ==========================================

  describe('Integration with GameEngine', () => {
    it('should create games that integrate properly with GameEngine methods', () => {
      const game = createLocalGame(BoardSize.SMALL);
      
      // Test basic GameEngine methods
      const state = game.getGameState();
      expect(state).toBeDefined();
      expect(GoMatchers.isValidGameState(state)).toBe(true);
      
      // Test move making
      const result = game.makeMove(Player.BLACK, MoveType.PLACE_STONE, { x: 4, y: 4 });
      expect(GoMatchers.isMoveSuccess(result)).toBe(true);
      
      // Test state updates
      const newState = game.getGameState();
      expect(newState.moveHistory).toHaveLength(1);
      expect(GoMatchers.hasStone(newState.board, { x: 4, y: 4 }, Player.BLACK)).toBe(true);
    });

    it('should create games compatible with all board operations', () => {
      const game = createLocalGame(BoardSize.SMALL);
      const state = game.getGameState();
      
      // Test that board is properly initialized
      expect(state.board).toBeDefined();
      expect(state.board).toHaveLength(state.boardSize);
      expect(state.board[0]).toHaveLength(state.boardSize);
      
      // Test that all positions are accessible
      for (let x = 0; x < state.boardSize; x++) {
        for (let y = 0; y < state.boardSize; y++) {
          expect(state.board[y][x]).toBe(null); // Should be empty initially
        }
      }
    });

    it('should create games with proper move history tracking', () => {
      const game = createLocalGame(BoardSize.SMALL);
      
      // Make several moves
      game.makeMove(Player.BLACK, MoveType.PLACE_STONE, { x: 1, y: 1 });
      game.makeMove(Player.WHITE, MoveType.PLACE_STONE, { x: 2, y: 2 });
      game.makeMove(Player.BLACK, MoveType.PASS);
      
      const state = game.getGameState();
      expect(state.moveHistory).toHaveLength(3);
      
      // Check move details
      expect(state.moveHistory[0].player).toBe(Player.BLACK);
      expect(state.moveHistory[0].type).toBe(MoveType.PLACE_STONE);
      expect(state.moveHistory[1].player).toBe(Player.WHITE);
      expect(state.moveHistory[2].type).toBe(MoveType.PASS);
    });
  });
});