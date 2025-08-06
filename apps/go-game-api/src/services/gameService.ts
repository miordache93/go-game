import Game, { IGame } from '../models/Game';
import User, { IUser } from '../models/User';

interface CreateGameDto {
  players: {
    black: string;
    white: string;
  };
  boardSize: number;
  timeLimit?: number;
  isRanked?: boolean;
}

interface UpdateGameDto {
  gameState?: any;
  lastMove?: any;
  status?: string;
}

interface PartykitGameDto {
  roomId: string;
  players: {
    black: { id: string; name: string };
    white: { id: string; name: string };
  };
  gameState: any;
  moves: any[];
  result: {
    winner?: string;
    scores?: {
      black: number;
      white: number;
    };
    reason?: string;
  };
  startedAt: Date;
  completedAt: Date;
}

class GameService {
  // Create a new game
  async createGame(data: CreateGameDto): Promise<IGame> {
    const game = new Game({
      players: data.players,
      boardSize: data.boardSize,
      timeLimit: data.timeLimit,
      isRanked: data.isRanked,
      gameState: this.initializeGameState(data.boardSize),
      moves: [],
      status: 'pending',
      createdAt: new Date(),
      currentTurn: 'black'
    });

    await game.save();
    return game;
  }

  // Get game by ID
  async getGameById(gameId: string): Promise<IGame | null> {
    return await Game.findById(gameId)
      .populate('players.black', 'username email elo')
      .populate('players.white', 'username email elo');
  }

  // Get user's games with pagination
  async getUserGames(
    userId: string,
    options: { page: number; limit: number; status?: string }
  ) {
    const query: any = {
      $or: [
        { 'players.black': userId },
        { 'players.white': userId }
      ]
    };

    if (options.status) {
      query.status = options.status;
    }

    const skip = (options.page - 1) * options.limit;

    const [games, total] = await Promise.all([
      Game.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(options.limit)
        .populate('players.black', 'username elo')
        .populate('players.white', 'username elo'),
      Game.countDocuments(query)
    ]);

    return {
      games,
      pagination: {
        total,
        page: options.page,
        limit: options.limit,
        pages: Math.ceil(total / options.limit)
      }
    };
  }

  // Update game state
  async updateGame(
    gameId: string,
    userId: string,
    updates: UpdateGameDto
  ): Promise<IGame | null> {
    const game = await Game.findById(gameId);
    
    if (!game) {
      throw new Error('Game not found');
    }

    // Verify user is part of the game
    if (game.players.black.toString() !== userId && 
        game.players.white.toString() !== userId) {
      throw new Error('Unauthorized to update this game');
    }

    // Update fields
    if (updates.gameState) game.gameState = updates.gameState;
    if (updates.lastMove) game.lastMove = updates.lastMove;
    if (updates.status) game.status = updates.status as any;
    
    game.updatedAt = new Date();

    await game.save();
    return game;
  }

  // Record a move
  async recordMove(
    gameId: string,
    userId: string,
    move: any,
    gameState: any
  ): Promise<IGame | null> {
    const game = await Game.findById(gameId);
    
    if (!game) {
      throw new Error('Game not found');
    }

    // Verify it's the player's turn
    const isBlackPlayer = game.players.black.toString() === userId;
    const isWhitePlayer = game.players.white.toString() === userId;
    
    if (!isBlackPlayer && !isWhitePlayer) {
      throw new Error('Not a player in this game');
    }

    if ((game.currentTurn === 'black' && !isBlackPlayer) ||
        (game.currentTurn === 'white' && !isWhitePlayer)) {
      throw new Error('Not your turn');
    }

    // Add move to history
    game.moves.push({
      ...move,
      timestamp: new Date(),
      player: game.currentTurn
    });

    // Update game state
    game.gameState = gameState;
    game.lastMove = move;
    game.currentTurn = game.currentTurn === 'black' ? 'white' : 'black';
    game.updatedAt = new Date();

    await game.save();
    return game;
  }

  // Get game history
  async getGameHistory(gameId: string) {
    const game = await Game.findById(gameId)
      .select('moves players boardSize createdAt completedAt status result');
    
    if (!game) {
      throw new Error('Game not found');
    }

    return {
      gameId: game._id,
      moves: game.moves,
      players: game.players,
      boardSize: game.boardSize,
      startedAt: game.createdAt,
      completedAt: game.completedAt,
      status: game.status,
      result: game.result
    };
  }

  // Save game from PartyKit webhook
  async savePartykitGame(data: PartykitGameDto): Promise<IGame> {
    // Find or create users
    const [blackUser, whiteUser] = await Promise.all([
      this.findOrCreateUser(data.players.black),
      this.findOrCreateUser(data.players.white)
    ]);

    const game = new Game({
      roomId: data.roomId,
      players: {
        black: blackUser._id,
        white: whiteUser._id
      },
      gameState: data.gameState,
      moves: data.moves,
      status: 'completed',
      result: data.result,
      createdAt: data.startedAt,
      completedAt: data.completedAt,
      isRanked: true
    });

    await game.save();

    // Update user statistics and ELO
    if (data.result.winner) {
      await this.updateUserStats(
        data.result.winner === 'black' ? blackUser : whiteUser,
        data.result.winner === 'black' ? whiteUser : blackUser,
        true
      );
    }

    return game;
  }

  // Get user statistics
  async getUserStatistics(userId: string) {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    const games = await Game.find({
      $or: [
        { 'players.black': userId },
        { 'players.white': userId }
      ],
      status: 'completed'
    });

    const stats = {
      totalGames: games.length,
      wins: 0,
      losses: 0,
      draws: 0,
      winRate: 0,
      currentStreak: 0,
      bestStreak: user.stats?.bestWinStreak || 0,
      elo: user.elo || 1500,
      rank: this.calculateRank(user.elo || 1500),
      recentGames: [] as any[],
      favoriteOpening: null,
      averageGameLength: 0
    };

    let streak = 0;
    let totalMoves = 0;

    games.forEach(game => {
      const isBlack = game.players.black.toString() === userId;
      const isWhite = game.players.white.toString() === userId;
      
      totalMoves += game.moves.length;

      if (game.result?.winner) {
        if ((game.result.winner === 'black' && isBlack) ||
            (game.result.winner === 'white' && isWhite)) {
          stats.wins++;
          streak++;
          if (streak > stats.bestStreak) {
            stats.bestStreak = streak;
          }
        } else {
          stats.losses++;
          streak = 0;
        }
      } else {
        stats.draws++;
        streak = 0;
      }
    });

    stats.currentStreak = streak;
    stats.winRate = stats.totalGames > 0 
      ? Math.round((stats.wins / stats.totalGames) * 100) 
      : 0;
    stats.averageGameLength = stats.totalGames > 0
      ? Math.round(totalMoves / stats.totalGames)
      : 0;

    // Get recent games
    stats.recentGames = await Game.find({
      $or: [
        { 'players.black': userId },
        { 'players.white': userId }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('players.black', 'username')
      .populate('players.white', 'username');

    return stats;
  }

  // Get leaderboard
  async getLeaderboard(options: {
    limit: number;
    offset: number;
    timeframe: string;
  }) {
    const query: any = {};
    
    // Add timeframe filter if needed
    if (options.timeframe === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query['stats.lastGameAt'] = { $gte: weekAgo };
    } else if (options.timeframe === 'monthly') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      query['stats.lastGameAt'] = { $gte: monthAgo };
    }

    const users = await User.find(query)
      .sort({ elo: -1 })
      .skip(options.offset)
      .limit(options.limit)
      .select('username elo stats.gamesPlayed stats.wins stats.losses');

    const total = await User.countDocuments(query);

    return {
      leaderboard: users.map((user, index) => ({
        rank: options.offset + index + 1,
        username: user.username,
        elo: user.elo || 1500,
        gamesPlayed: user.stats?.gamesPlayed || 0,
        wins: user.stats?.wins || 0,
        losses: user.stats?.losses || 0,
        winRate: user.stats?.gamesPlayed 
          ? Math.round((user.stats.wins / user.stats.gamesPlayed) * 100)
          : 0
      })),
      total
    };
  }

  // Resign game
  async resignGame(gameId: string, userId: string): Promise<IGame | null> {
    const game = await Game.findById(gameId);
    
    if (!game) {
      throw new Error('Game not found');
    }

    const isBlack = game.players.black.toString() === userId;
    const isWhite = game.players.white.toString() === userId;
    
    if (!isBlack && !isWhite) {
      throw new Error('Not a player in this game');
    }

    game.status = 'completed';
    game.result = {
      winner: isBlack ? 'white' : 'black',
      reason: 'resignation'
    };
    game.completedAt = new Date();

    await game.save();

    // Update ELO ratings
    const winner = isBlack ? game.players.white : game.players.black;
    const loser = isBlack ? game.players.black : game.players.white;
    
    await this.updateEloRatings(winner.toString(), loser.toString());

    return game;
  }

  // Calculate ELO rating change
  private calculateEloChange(winnerElo: number, loserElo: number): {
    winnerChange: number;
    loserChange: number;
  } {
    const K = 32; // K-factor
    const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
    
    const winnerChange = Math.round(K * (1 - expectedWinner));
    const loserChange = Math.round(K * (0 - expectedLoser));
    
    return { winnerChange, loserChange };
  }

  // Update ELO ratings
  private async updateEloRatings(winnerId: string, loserId: string) {
    const [winner, loser] = await Promise.all([
      User.findById(winnerId),
      User.findById(loserId)
    ]);

    if (!winner || !loser) return;

    const { winnerChange, loserChange } = this.calculateEloChange(
      winner.elo || 1500,
      loser.elo || 1500
    );

    winner.elo = (winner.elo || 1500) + winnerChange;
    loser.elo = (loser.elo || 1500) + loserChange;

    await Promise.all([
      winner.save(),
      loser.save()
    ]);
  }

  // Calculate rank from ELO
  private calculateRank(elo: number): string {
    if (elo < 1000) return '30k';
    if (elo < 1100) return '25k';
    if (elo < 1200) return '20k';
    if (elo < 1300) return '15k';
    if (elo < 1400) return '10k';
    if (elo < 1500) return '5k';
    if (elo < 1600) return '1k';
    if (elo < 1700) return '1d';
    if (elo < 1800) return '2d';
    if (elo < 1900) return '3d';
    if (elo < 2000) return '4d';
    if (elo < 2100) return '5d';
    if (elo < 2200) return '6d';
    if (elo < 2300) return '7d';
    if (elo < 2400) return '8d';
    return '9d';
  }

  // Initialize game state based on board size
  private initializeGameState(boardSize: number) {
    const board = Array(boardSize).fill(null).map(() => 
      Array(boardSize).fill(null)
    );
    
    return {
      board,
      currentPlayer: 'black',
      captures: { black: 0, white: 0 },
      lastMove: null,
      moveNumber: 0,
      passes: 0,
      koPoint: null
    };
  }

  // Find or create user for PartyKit integration
  private async findOrCreateUser(userData: { id: string; name: string }): Promise<IUser> {
    let user = await User.findOne({ partykitId: userData.id });
    
    if (!user) {
      user = await User.findOne({ username: userData.name });
    }
    
    if (!user) {
      user = new User({
        username: userData.name,
        email: `${userData.name}@partykit.temp`,
        password: 'temporary',
        partykitId: userData.id,
        elo: 1500,
        stats: {
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0
        }
      });
      await user.save();
    }
    
    return user;
  }

  // Update user statistics after game
  private async updateUserStats(winner: IUser, loser: IUser, updateElo: boolean = true) {
    // Update winner stats
    if (!winner.stats) {
      winner.stats = {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winStreak: 0,
        bestWinStreak: 0,
        lastGameAt: new Date()
      };
    }
    
    winner.stats.gamesPlayed++;
    winner.stats.wins++;
    winner.stats.winStreak = (winner.stats.winStreak || 0) + 1;
    winner.stats.bestWinStreak = Math.max(
      winner.stats.bestWinStreak || 0,
      winner.stats.winStreak
    );
    winner.stats.lastGameAt = new Date();

    // Update loser stats
    if (!loser.stats) {
      loser.stats = {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winStreak: 0,
        bestWinStreak: 0,
        lastGameAt: new Date()
      };
    }
    
    loser.stats.gamesPlayed++;
    loser.stats.losses++;
    loser.stats.winStreak = 0;
    loser.stats.lastGameAt = new Date();

    // Update ELO if requested
    if (updateElo) {
      const { winnerChange, loserChange } = this.calculateEloChange(
        winner.elo || 1500,
        loser.elo || 1500
      );
      
      winner.elo = (winner.elo || 1500) + winnerChange;
      loser.elo = (loser.elo || 1500) + loserChange;
    }

    await Promise.all([
      winner.save(),
      loser.save()
    ]);
  }
}

export default new GameService();