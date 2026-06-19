import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const gameSave = vi.fn();
  const Game = vi.fn(function (
    this: Record<string, unknown>,
    data: Record<string, unknown>
  ) {
    Object.assign(this, data);
    this.save = gameSave;
  });
  Object.assign(Game, {
    findOne: vi.fn(),
  });

  const User = {
    findById: vi.fn(),
    findOne: vi.fn(),
  };

  return { Game, User, gameSave };
});

vi.mock('../models/Game', () => ({
  default: mocks.Game,
}));

vi.mock('../models/User', () => ({
  default: mocks.User,
}));

import gameService from './gameService';

const partykitGameData = {
  roomId: 'room-123',
  players: {
    black: {
      id: 'black-client',
      name: 'Black Player',
      userId: '111111111111111111111111',
    },
    white: {
      id: 'white-client',
      name: 'White Player',
      userId: '222222222222222222222222',
    },
  },
  gameState: { board: [], currentPlayer: 'black' },
  moves: [],
  result: {
    winner: 'black',
    scores: { black: 12, white: 6.5 },
    reason: 'resignation',
  },
  startedAt: new Date('2026-01-01T00:00:00.000Z'),
  completedAt: new Date('2026-01-01T01:00:00.000Z'),
};

function createUser(id: string) {
  return {
    _id: id,
    elo: 1500,
    stats: {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      winStreak: 0,
      bestWinStreak: 0,
      lastGameAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    save: vi.fn(),
  };
}

describe('gameService.savePartykitGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an existing game for duplicate room webhook retries', async () => {
    const existingGame = { _id: 'existing-game-id', roomId: 'room-123' };
    vi.mocked(mocks.Game.findOne).mockResolvedValue(existingGame);

    const result = await gameService.savePartykitGame(partykitGameData);

    expect(result).toBe(existingGame);
    expect(mocks.Game).not.toHaveBeenCalled();
    expect(mocks.User.findById).not.toHaveBeenCalled();
    expect(mocks.gameSave).not.toHaveBeenCalled();
  });

  it('returns the existing game when a concurrent retry hits the room id unique index', async () => {
    const blackUser = createUser('black-user-id');
    const whiteUser = createUser('white-user-id');
    const existingGame = { _id: 'existing-game-id', roomId: 'room-123' };

    vi.mocked(mocks.Game.findOne)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingGame);
    vi.mocked(mocks.User.findById)
      .mockResolvedValueOnce(blackUser)
      .mockResolvedValueOnce(whiteUser);
    mocks.gameSave.mockRejectedValueOnce({ code: 11000 });

    const result = await gameService.savePartykitGame(partykitGameData);

    expect(result).toBe(existingGame);
    expect(mocks.Game).toHaveBeenCalledTimes(1);
    expect(blackUser.save).not.toHaveBeenCalled();
    expect(whiteUser.save).not.toHaveBeenCalled();
  });
});
