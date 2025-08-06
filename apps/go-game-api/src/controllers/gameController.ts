import { Request, Response } from 'express';
import gameService from '../services/gameService';
import { AuthRequest } from '../middleware/auth';

class GameController {
  // Create a new game
  async createGame(req: AuthRequest, res: Response) {
    try {
      const { opponentId, boardSize = 19, timeLimit, isRanked = false } = req.body;
      
      const game = await gameService.createGame({
        players: {
          black: req.userId!,
          white: opponentId
        },
        boardSize,
        timeLimit,
        isRanked
      });

      res.status(201).json({
        success: true,
        data: game
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get game by ID
  async getGame(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const game = await gameService.getGameById(id);

      if (!game) {
        return res.status(404).json({
          success: false,
          error: 'Game not found'
        });
      }

      return res.json({
        success: true,
        data: game
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // List user's games
  async getUserGames(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      
      const games = await gameService.getUserGames(
        req.userId!,
        {
          page: Number(page),
          limit: Number(limit),
          status: status as string
        }
      );

      res.json({
        success: true,
        data: games
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update game state (for recording moves)
  async updateGame(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { gameState, lastMove, status } = req.body;

      const game = await gameService.updateGame(
        id,
        req.userId!,
        {
          gameState,
          lastMove,
          status
        }
      );

      res.json({
        success: true,
        data: game
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // Record a move
  async recordMove(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { move, gameState } = req.body;

      const game = await gameService.recordMove(
        id,
        req.userId!,
        move,
        gameState
      );

      res.json({
        success: true,
        data: game
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get game history/moves
  async getGameHistory(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      
      const history = await gameService.getGameHistory(id);

      res.json({
        success: true,
        data: history
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // Webhook endpoint for PartyKit to save completed games
  async savePartykitGame(req: Request, res: Response): Promise<Response> {
    try {
      const { 
        roomId,
        players,
        gameState,
        moves,
        result,
        startedAt,
        completedAt 
      } = req.body;

      // Verify webhook secret (you should add this to env)
      const webhookSecret = req.headers['x-webhook-secret'];
      if (webhookSecret !== process.env.PARTYKIT_WEBHOOK_SECRET) {
        return res.status(401).json({
          success: false,
          error: 'Invalid webhook secret'
        });
      }

      const game = await gameService.savePartykitGame({
        roomId,
        players,
        gameState,
        moves,
        result,
        startedAt,
        completedAt
      });

      return res.json({
        success: true,
        data: game
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get user statistics
  async getUserStats(req: AuthRequest, res: Response) {
    try {
      const userId = req.params.userId || req.userId!;
      
      const stats = await gameService.getUserStatistics(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get leaderboard
  async getLeaderboard(req: Request, res: Response) {
    try {
      const { limit = 100, offset = 0, timeframe = 'all' } = req.query;
      
      const leaderboard = await gameService.getLeaderboard({
        limit: Number(limit),
        offset: Number(offset),
        timeframe: timeframe as string
      });

      res.json({
        success: true,
        data: leaderboard
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // Resign game
  async resignGame(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      
      const game = await gameService.resignGame(id, req.userId!);

      res.json({
        success: true,
        data: game
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default new GameController();