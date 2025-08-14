import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import gameController from './gameController';
import gameService from '../services/gameService';
import { AuthRequest } from '../middleware/auth';

// Mock dependencies
vi.mock('../services/gameService');
const MockedGameService = vi.mocked(gameService);

// Helper function to create mock request/response objects
const createMockAuthReq = (body: any = {}, params: any = {}, query: any = {}, userId?: string) => ({
  body,
  params,
  query,
  headers: {},
  userId: userId || 'mock-user-id',
  user: { _id: userId || 'mock-user-id', username: 'testuser' },
}) as any as AuthRequest;

const createMockReq = (body: any = {}, params: any = {}, query: any = {}, headers: any = {}) => ({
  body,
  params,
  query,
  headers,
}) as any as Request;

const createMockRes = () => {
  const res = {} as any as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('GameController', () => {
  let req: AuthRequest;
  let res: Response;

  beforeEach(() => {
    vi.clearAllMocks();
    req = createMockAuthReq();
    res = createMockRes();
  });

  describe('createGame', () => {
    const gameData = {
      opponentId: 'opponent-user-id',
      boardSize: 19,
      timeLimit: 1800,
      isRanked: true,
    };

    const mockGame = {
      _id: 'mock-game-id',
      players: {
        black: 'mock-user-id',
        white: 'opponent-user-id',
      },
      boardSize: 19,
      timeLimit: 1800,
      isRanked: true,
      status: 'pending',
      createdAt: new Date(),
    };

    it('should successfully create a new game with all parameters', async () => {
      req.body = gameData;
      MockedGameService.createGame.mockResolvedValue(mockGame as any);

      await gameController.createGame(req, res);

      expect(MockedGameService.createGame).toHaveBeenCalledWith({
        players: {
          black: 'mock-user-id',
          white: gameData.opponentId,
        },
        boardSize: gameData.boardSize,
        timeLimit: gameData.timeLimit,
        isRanked: gameData.isRanked,
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockGame,
      });
    });

    it('should successfully create a game with default parameters', async () => {
      const minimalGameData = { opponentId: 'opponent-user-id' };
      req.body = minimalGameData;
      MockedGameService.createGame.mockResolvedValue(mockGame as any);

      await gameController.createGame(req, res);

      expect(MockedGameService.createGame).toHaveBeenCalledWith({
        players: {
          black: 'mock-user-id',
          white: minimalGameData.opponentId,
        },
        boardSize: 19, // default
        timeLimit: undefined,
        isRanked: false, // default
      });
    });

    it('should handle service errors during game creation', async () => {
      req.body = gameData;
      MockedGameService.createGame.mockRejectedValue(new Error('Cannot create game'));

      await gameController.createGame(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot create game',
      });
    });

    it('should create game with custom board size', async () => {
      const customGameData = { ...gameData, boardSize: 13 };
      req.body = customGameData;
      MockedGameService.createGame.mockResolvedValue({ ...mockGame, boardSize: 13 } as any);

      await gameController.createGame(req, res);

      expect(MockedGameService.createGame).toHaveBeenCalledWith(
        expect.objectContaining({ boardSize: 13 })
      );
    });

    it('should handle missing userId', async () => {
      req.body = gameData;
      req.userId = undefined;
      MockedGameService.createGame.mockResolvedValue(mockGame as any);

      await gameController.createGame(req, res);

      expect(MockedGameService.createGame).toHaveBeenCalledWith({
        players: {
          black: undefined,
          white: gameData.opponentId,
        },
        boardSize: gameData.boardSize,
        timeLimit: gameData.timeLimit,
        isRanked: gameData.isRanked,
      });
    });
  });

  describe('getGame', () => {
    const mockGame = {
      _id: 'mock-game-id',
      players: {
        black: 'mock-user-id',
        white: 'opponent-user-id',
      },
      boardSize: 19,
      status: 'in_progress',
      gameState: { board: [], currentPlayer: 'black' },
    };

    it('should successfully retrieve a game by ID', async () => {
      req.params = { id: 'mock-game-id' };
      MockedGameService.getGameById.mockResolvedValue(mockGame as any);

      const result = await gameController.getGame(req, res);

      expect(MockedGameService.getGameById).toHaveBeenCalledWith('mock-game-id');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockGame,
      });
      expect(result).toBe(res);
    });

    it('should return 404 when game is not found', async () => {
      req.params = { id: 'non-existent-game-id' };
      MockedGameService.getGameById.mockResolvedValue(null);

      const result = await gameController.getGame(req, res);

      expect(MockedGameService.getGameById).toHaveBeenCalledWith('non-existent-game-id');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Game not found',
      });
      expect(result).toBe(res);
    });

    it('should handle service errors', async () => {
      req.params = { id: 'mock-game-id' };
      MockedGameService.getGameById.mockRejectedValue(new Error('Database error'));

      const result = await gameController.getGame(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error',
      });
      expect(result).toBe(res);
    });
  });

  describe('getUserGames', () => {
    const mockGames = [
      {
        _id: 'game1',
        players: { black: 'mock-user-id', white: 'opponent1' },
        status: 'completed',
      },
      {
        _id: 'game2',
        players: { black: 'opponent2', white: 'mock-user-id' },
        status: 'in_progress',
      },
    ];

    it('should successfully retrieve user games with default pagination', async () => {
      req.query = {};
      MockedGameService.getUserGames.mockResolvedValue(mockGames as any);

      await gameController.getUserGames(req, res);

      expect(MockedGameService.getUserGames).toHaveBeenCalledWith('mock-user-id', {
        page: 1,
        limit: 10,
        status: undefined,
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockGames,
      });
    });

    it('should handle custom pagination and filtering', async () => {
      req.query = { page: '2', limit: '20', status: 'completed' };
      MockedGameService.getUserGames.mockResolvedValue(mockGames as any);

      await gameController.getUserGames(req, res);

      expect(MockedGameService.getUserGames).toHaveBeenCalledWith('mock-user-id', {
        page: 2,
        limit: 20,
        status: 'completed',
      });
    });

    it('should handle service errors', async () => {
      req.query = {};
      MockedGameService.getUserGames.mockRejectedValue(new Error('Failed to retrieve games'));

      await gameController.getUserGames(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve games',
      });
    });

    it('should handle string query parameters correctly', async () => {
      req.query = { page: 'invalid', limit: 'invalid' };
      MockedGameService.getUserGames.mockResolvedValue(mockGames as any);

      await gameController.getUserGames(req, res);

      expect(MockedGameService.getUserGames).toHaveBeenCalledWith('mock-user-id', {
        page: NaN,
        limit: NaN,
        status: undefined,
      });
    });
  });

  describe('updateGame', () => {
    const updateData = {
      gameState: { board: [[0, 1], [1, 0]], currentPlayer: 'white' },
      lastMove: { x: 3, y: 4, player: 'black' },
      status: 'in_progress',
    };

    const mockUpdatedGame = {
      _id: 'mock-game-id',
      ...updateData,
      updatedAt: new Date(),
    };

    it('should successfully update a game', async () => {
      req.params = { id: 'mock-game-id' };
      req.body = updateData;
      MockedGameService.updateGame.mockResolvedValue(mockUpdatedGame as any);

      await gameController.updateGame(req, res);

      expect(MockedGameService.updateGame).toHaveBeenCalledWith(
        'mock-game-id',
        'mock-user-id',
        updateData
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedGame,
      });
    });

    it('should handle partial updates', async () => {
      const partialUpdate = { status: 'completed' };
      req.params = { id: 'mock-game-id' };
      req.body = partialUpdate;
      MockedGameService.updateGame.mockResolvedValue({ ...mockUpdatedGame, ...partialUpdate } as any);

      await gameController.updateGame(req, res);

      expect(MockedGameService.updateGame).toHaveBeenCalledWith(
        'mock-game-id',
        'mock-user-id',
        partialUpdate
      );
    });

    it('should handle service errors', async () => {
      req.params = { id: 'mock-game-id' };
      req.body = updateData;
      MockedGameService.updateGame.mockRejectedValue(new Error('Update failed'));

      await gameController.updateGame(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Update failed',
      });
    });
  });

  describe('recordMove', () => {
    const moveData = {
      move: { x: 3, y: 4, player: 'black' },
      gameState: { board: [[0, 1], [1, 0]], currentPlayer: 'white' },
    };

    const mockUpdatedGame = {
      _id: 'mock-game-id',
      moves: [moveData.move],
      gameState: moveData.gameState,
      updatedAt: new Date(),
    };

    it('should successfully record a move', async () => {
      req.params = { id: 'mock-game-id' };
      req.body = moveData;
      MockedGameService.recordMove.mockResolvedValue(mockUpdatedGame as any);

      await gameController.recordMove(req, res);

      expect(MockedGameService.recordMove).toHaveBeenCalledWith(
        'mock-game-id',
        'mock-user-id',
        moveData.move,
        moveData.gameState
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedGame,
      });
    });

    it('should handle service errors during move recording', async () => {
      req.params = { id: 'mock-game-id' };
      req.body = moveData;
      MockedGameService.recordMove.mockRejectedValue(new Error('Invalid move'));

      await gameController.recordMove(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid move',
      });
    });

    it('should handle missing move data', async () => {
      req.params = { id: 'mock-game-id' };
      req.body = { gameState: moveData.gameState };
      MockedGameService.recordMove.mockResolvedValue(mockUpdatedGame as any);

      await gameController.recordMove(req, res);

      expect(MockedGameService.recordMove).toHaveBeenCalledWith(
        'mock-game-id',
        'mock-user-id',
        undefined,
        moveData.gameState
      );
    });
  });

  describe('getGameHistory', () => {
    const mockHistory = {
      gameId: 'mock-game-id',
      moves: [
        { x: 3, y: 4, player: 'black', timestamp: new Date() },
        { x: 4, y: 3, player: 'white', timestamp: new Date() },
      ],
      totalMoves: 2,
    };

    it('should successfully retrieve game history', async () => {
      req.params = { id: 'mock-game-id' };
      MockedGameService.getGameHistory.mockResolvedValue(mockHistory as any);

      await gameController.getGameHistory(req, res);

      expect(MockedGameService.getGameHistory).toHaveBeenCalledWith('mock-game-id');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockHistory,
      });
    });

    it('should handle service errors', async () => {
      req.params = { id: 'mock-game-id' };
      MockedGameService.getGameHistory.mockRejectedValue(new Error('History not found'));

      await gameController.getGameHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'History not found',
      });
    });
  });

  describe('savePartykitGame', () => {
    const partykitGameData = {
      roomId: 'room-123',
      players: {
        black: { id: 'user1', name: 'Player1' },
        white: { id: 'user2', name: 'Player2' },
      },
      gameState: { board: [], currentPlayer: 'black' },
      moves: [],
      result: {
        winner: 'black',
        scores: { black: 50, white: 45 },
        reason: 'resignation',
      },
      startedAt: new Date(),
      completedAt: new Date(),
    };

    const mockSavedGame = {
      _id: 'saved-game-id',
      ...partykitGameData,
    };

    beforeEach(() => {
      req = createMockReq();
      process.env.PARTYKIT_WEBHOOK_SECRET = 'test-webhook-secret';
    });

    it('should successfully save PartyKit game with valid webhook secret', async () => {
      req.body = partykitGameData;
      req.headers = { 'x-webhook-secret': 'test-webhook-secret' };
      MockedGameService.savePartykitGame.mockResolvedValue(mockSavedGame as any);

      const result = await gameController.savePartykitGame(req, res);

      expect(MockedGameService.savePartykitGame).toHaveBeenCalledWith(partykitGameData);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockSavedGame,
      });
      expect(result).toBe(res);
    });

    it('should reject request with invalid webhook secret', async () => {
      req.body = partykitGameData;
      req.headers = { 'x-webhook-secret': 'invalid-secret' };

      const result = await gameController.savePartykitGame(req, res);

      expect(MockedGameService.savePartykitGame).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid webhook secret',
      });
      expect(result).toBe(res);
    });

    it('should reject request with missing webhook secret', async () => {
      req.body = partykitGameData;
      req.headers = {};

      const result = await gameController.savePartykitGame(req, res);

      expect(MockedGameService.savePartykitGame).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid webhook secret',
      });
      expect(result).toBe(res);
    });

    it('should handle service errors during game saving', async () => {
      req.body = partykitGameData;
      req.headers = { 'x-webhook-secret': 'test-webhook-secret' };
      MockedGameService.savePartykitGame.mockRejectedValue(new Error('Save failed'));

      const result = await gameController.savePartykitGame(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Save failed',
      });
      expect(result).toBe(res);
    });
  });

  describe('getUserStats', () => {
    const mockStats = {
      userId: 'mock-user-id',
      gamesPlayed: 25,
      wins: 15,
      losses: 8,
      draws: 2,
      winRate: 0.6,
      elo: 1650,
    };

    it('should successfully retrieve stats for authenticated user', async () => {
      req.params = {};
      MockedGameService.getUserStatistics.mockResolvedValue(mockStats as any);

      await gameController.getUserStats(req, res);

      expect(MockedGameService.getUserStatistics).toHaveBeenCalledWith('mock-user-id');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
      });
    });

    it('should successfully retrieve stats for specific user', async () => {
      req.params = { userId: 'other-user-id' };
      MockedGameService.getUserStatistics.mockResolvedValue({ ...mockStats, userId: 'other-user-id' } as any);

      await gameController.getUserStats(req, res);

      expect(MockedGameService.getUserStatistics).toHaveBeenCalledWith('other-user-id');
    });

    it('should handle service errors', async () => {
      req.params = {};
      MockedGameService.getUserStatistics.mockRejectedValue(new Error('Stats not available'));

      await gameController.getUserStats(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Stats not available',
      });
    });
  });

  describe('getLeaderboard', () => {
    const mockLeaderboard = [
      { userId: 'user1', username: 'Player1', elo: 1800, rank: 1 },
      { userId: 'user2', username: 'Player2', elo: 1750, rank: 2 },
      { userId: 'user3', username: 'Player3', elo: 1700, rank: 3 },
    ];

    beforeEach(() => {
      req = createMockReq();
    });

    it('should successfully retrieve leaderboard with default parameters', async () => {
      req.query = {};
      MockedGameService.getLeaderboard.mockResolvedValue(mockLeaderboard as any);

      await gameController.getLeaderboard(req, res);

      expect(MockedGameService.getLeaderboard).toHaveBeenCalledWith({
        limit: 100,
        offset: 0,
        timeframe: 'all',
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockLeaderboard,
      });
    });

    it('should handle custom leaderboard parameters', async () => {
      req.query = { limit: '50', offset: '10', timeframe: 'monthly' };
      MockedGameService.getLeaderboard.mockResolvedValue(mockLeaderboard as any);

      await gameController.getLeaderboard(req, res);

      expect(MockedGameService.getLeaderboard).toHaveBeenCalledWith({
        limit: 50,
        offset: 10,
        timeframe: 'monthly',
      });
    });

    it('should handle service errors', async () => {
      req.query = {};
      MockedGameService.getLeaderboard.mockRejectedValue(new Error('Leaderboard unavailable'));

      await gameController.getLeaderboard(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Leaderboard unavailable',
      });
    });
  });

  describe('resignGame', () => {
    const mockResignedGame = {
      _id: 'mock-game-id',
      status: 'completed',
      result: {
        winner: 'white',
        reason: 'resignation',
      },
      completedAt: new Date(),
    };

    it('should successfully resign from a game', async () => {
      req.params = { id: 'mock-game-id' };
      MockedGameService.resignGame.mockResolvedValue(mockResignedGame as any);

      await gameController.resignGame(req, res);

      expect(MockedGameService.resignGame).toHaveBeenCalledWith('mock-game-id', 'mock-user-id');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResignedGame,
      });
    });

    it('should handle service errors during resignation', async () => {
      req.params = { id: 'mock-game-id' };
      MockedGameService.resignGame.mockRejectedValue(new Error('Cannot resign from this game'));

      await gameController.resignGame(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot resign from this game',
      });
    });

    it('should handle resignation from non-existent game', async () => {
      req.params = { id: 'non-existent-game' };
      MockedGameService.resignGame.mockRejectedValue(new Error('Game not found'));

      await gameController.resignGame(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Game not found',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      req.body = { opponentId: 'test' };
      MockedGameService.createGame.mockRejectedValue(new Error('Unexpected error'));

      await gameController.createGame(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unexpected error',
      });
    });

    it('should handle errors without message property', async () => {
      req.body = { opponentId: 'test' };
      const errorWithoutMessage = { name: 'CustomError' };
      MockedGameService.createGame.mockRejectedValue(errorWithoutMessage);

      await gameController.createGame(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: undefined, // Since error.message is undefined
      });
    });
  });
});