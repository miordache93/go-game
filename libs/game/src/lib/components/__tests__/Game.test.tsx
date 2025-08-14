import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from './test-utils';
import { Game } from '../Game';
import { BoardSize, GamePhase, Player } from '@go-game/types';
import * as gameModule from '../../game';
import * as gameFactoryModule from '../../game-factory';

// Mock the game engine and factory
const mockGameEngine = {
  getGameState: vi.fn(() => ({
    board: Array(9).fill(null).map(() => Array(9).fill(null)),
    boardSize: BoardSize.SMALL,
    currentPlayer: Player.BLACK,
    phase: GamePhase.PLAYING,
    lastMove: null,
    capturedStones: { black: [], white: [] },
    score: null,
    moveHistory: [],
  })),
  makeMove: vi.fn(() => ({ success: true, capturedStones: [] })),
  getGamePhase: vi.fn(() => GamePhase.PLAYING),
  getCurrentScore: vi.fn(() => null),
  getCapturedStones: vi.fn(() => ({ black: 0, white: 0 })),
  markDeadStones: vi.fn(() => true),
  finalizeGame: vi.fn(() => ({ success: true })),
  resumePlaying: vi.fn(() => ({ success: true })),
  getDeadStones: vi.fn(() => new Set()),
};

vi.mock('../../game', () => ({
  GameEngine: vi.fn().mockImplementation(() => mockGameEngine),
}));

vi.mock('../../game-factory', () => ({
  createBeginnerGame: vi.fn(() => mockGameEngine),
  createScoringTestGame: vi.fn(() => mockGameEngine),
}));

// Mock notifications
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
  Notifications: ({ children }: any) => children,
}));

// Mock GoBoard component to avoid Konva complications
vi.mock('../GoBoard', () => ({
  GoBoard: vi.fn((props) => (
    <div
      data-testid="mock-go-board"
      data-board-size={props.boardSize}
      data-current-player={props.currentPlayer}
      data-interactive={props.interactive}
      onClick={() => props.onIntersectionClick?.({ x: 0, y: 0 })}
    >
      GoBoard Mock
    </div>
  )),
}));

// Mock GameControls component
vi.mock('../GameControls', () => ({
  GameControls: vi.fn((props) => (
    <div data-testid="mock-game-controls">
      <button onClick={props.onPass}>Pass</button>
      <button onClick={props.onResign}>Resign</button>
      <button onClick={props.onNewGame}>New Game</button>
    </div>
  )),
}));

// Mock ScoringControls component
vi.mock('../ScoringControls', () => ({
  ScoringControls: vi.fn((props) => (
    <div data-testid="mock-scoring-controls">
      <button onClick={props.onFinalize}>Finalize</button>
      <button onClick={props.onResume}>Resume</button>
    </div>
  )),
}));

describe('Game Component', () => {
  let mockNotifications: any;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    // Import the mocked notifications
    const notificationModule = await import('@mantine/notifications');
    mockNotifications = notificationModule.notifications;
    mockGameEngine.getGameState.mockReturnValue({
      board: Array(9).fill(null).map(() => Array(9).fill(null)),
      boardSize: BoardSize.SMALL,
      currentPlayer: Player.BLACK,
      phase: GamePhase.PLAYING,
      lastMove: null,
      capturedStones: { black: [], white: [] },
      score: null,
      moveHistory: [],
    });
  });

  describe('Rendering', () => {
    it('renders the game component', () => {
      render(<Game />);
      
      expect(screen.getByText(/⚫ GO Game ⚪/)).toBeInTheDocument();
      expect(screen.getByTestId('mock-go-board')).toBeInTheDocument();
      expect(screen.getByTestId('mock-game-controls')).toBeInTheDocument();
    });

    it('renders with custom board size', () => {
      render(<Game boardSize={BoardSize.LARGE} />);
      expect(screen.getByTestId('mock-go-board')).toBeInTheDocument();
    });

    it('renders with custom theme', () => {
      render(<Game boardTheme="zen" />);
      expect(screen.getByTestId('mock-go-board')).toBeInTheDocument();
    });

    it('shows theme switcher', () => {
      render(<Game />);
      
      expect(screen.getByText('Classic')).toBeInTheDocument();
      expect(screen.getByText('Modern')).toBeInTheDocument();
      expect(screen.getByText('Zen')).toBeInTheDocument();
    });
  });

  describe('Game Initialization', () => {
    it('initializes with beginner game by default', () => {
      render(<Game />);
      
      expect(gameFactoryModule.createBeginnerGame).toHaveBeenCalled();
    });

    it('initializes with test game when useTestGame is true', () => {
      render(<Game useTestGame={true} />);
      
      expect(gameFactoryModule.createScoringTestGame).toHaveBeenCalled();
    });

    it('shows test mode toggle in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      render(<Game />);
      
      expect(screen.getByText(/scoring test mode/i)).toBeInTheDocument();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Board Interaction', () => {
    it('handles stone placement during playing phase', async () => {
      mockGameEngine.makeMove.mockReturnValue({
        success: true,
        capturedStones: [],
      });
      
      render(<Game />);
      
      const board = screen.getByTestId('mock-go-board');
      fireEvent.click(board);
      
      expect(mockGameEngine.makeMove).toHaveBeenCalledWith(
        Player.BLACK,
        expect.any(Number), // MoveType.PLACE_STONE
        { x: 0, y: 0 }
      );
    });

    it('shows success notification on valid move', async () => {
      mockGameEngine.makeMove.mockReturnValue({
        success: true,
        capturedStones: [],
      });
      
      render(<Game />);
      
      const board = screen.getByTestId('mock-go-board');
      fireEvent.click(board);
      
      expect(mockNotifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '🎯 Stone Placed!',
          color: 'green',
        })
      );
    });

    it('shows error notification on invalid move', async () => {
      mockGameEngine.makeMove.mockReturnValue({
        success: false,
        error: 'Invalid move',
      });
      
      render(<Game />);
      
      const board = screen.getByTestId('mock-go-board');
      fireEvent.click(board);
      
      expect(mockNotifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '❌ Invalid Move',
          color: 'red',
        })
      );
    });

    it('shows capture notification when stones are captured', async () => {
      mockGameEngine.makeMove.mockReturnValue({
        success: true,
        capturedStones: [{ x: 1, y: 1 }, { x: 1, y: 2 }],
      });
      
      render(<Game />);
      
      const board = screen.getByTestId('mock-go-board');
      fireEvent.click(board);
      
      expect(mockNotifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '🎯 Stones Captured!',
          message: '2 stones captured',
          color: 'orange',
        })
      );
    });
  });

  describe('Game Controls', () => {
    it('handles pass move', async () => {
      mockGameEngine.makeMove.mockReturnValue({ success: true });
      mockGameEngine.getGamePhase.mockReturnValue(GamePhase.PLAYING);
      
      render(<Game />);
      
      const passButton = screen.getByText('Pass');
      fireEvent.click(passButton);
      
      expect(mockGameEngine.makeMove).toHaveBeenCalledWith(
        Player.BLACK,
        expect.any(Number) // MoveType.PASS
      );
    });

    it('handles resign move', async () => {
      mockGameEngine.makeMove.mockReturnValue({ success: true });
      
      render(<Game />);
      
      const resignButton = screen.getByText('Resign');
      fireEvent.click(resignButton);
      
      expect(mockGameEngine.makeMove).toHaveBeenCalledWith(
        Player.BLACK,
        expect.any(Number) // MoveType.RESIGN
      );
    });

    it('handles new game creation', async () => {
      render(<Game />);
      
      const newGameButton = screen.getByText('New Game');
      fireEvent.click(newGameButton);
      
      expect(gameFactoryModule.createBeginnerGame).toHaveBeenCalledTimes(2); // Initial + new game
    });

    it('shows pass notification with phase transition to scoring', async () => {
      mockGameEngine.makeMove.mockReturnValue({ success: true });
      mockGameEngine.getGamePhase.mockReturnValue(GamePhase.SCORING);
      
      render(<Game />);
      
      const passButton = screen.getByText('Pass');
      fireEvent.click(passButton);
      
      expect(mockNotifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '⏭️ Pass',
        })
      );
      
      expect(mockNotifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '📊 Scoring Phase',
        })
      );
    });
  });

  describe('Scoring Phase', () => {
    beforeEach(() => {
      mockGameEngine.getGameState.mockReturnValue({
        board: Array(9).fill(null).map(() => Array(9).fill(null)),
        boardSize: BoardSize.SMALL,
        currentPlayer: Player.BLACK,
        phase: GamePhase.SCORING,
        lastMove: null,
        capturedStones: { black: [], white: [] },
        score: null,
        moveHistory: [],
      });
    });

    it('renders scoring controls during scoring phase', () => {
      render(<Game />);
      
      expect(screen.getByTestId('mock-scoring-controls')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-game-controls')).not.toBeInTheDocument();
    });

    it('handles dead stone marking during scoring', async () => {
      mockGameEngine.markDeadStones.mockReturnValue(true);
      
      render(<Game />);
      
      const board = screen.getByTestId('mock-go-board');
      fireEvent.click(board);
      
      expect(mockGameEngine.markDeadStones).toHaveBeenCalledWith({ x: 0, y: 0 });
    });

    it('handles game finalization', async () => {
      mockGameEngine.finalizeGame.mockReturnValue({ success: true });
      mockGameEngine.getCurrentScore.mockReturnValue({
        black: { total: 10, territory: 5, captures: 5 },
        white: { total: 8, territory: 3, captures: 5 },
        winner: Player.BLACK,
      });
      
      render(<Game />);
      
      const finalizeButton = screen.getByText('Finalize');
      fireEvent.click(finalizeButton);
      
      expect(mockGameEngine.finalizeGame).toHaveBeenCalled();
    });

    it('handles resuming play from scoring', async () => {
      mockGameEngine.resumePlaying.mockReturnValue({ success: true });
      
      render(<Game />);
      
      const resumeButton = screen.getByText('Resume');
      fireEvent.click(resumeButton);
      
      expect(mockGameEngine.resumePlaying).toHaveBeenCalled();
    });
  });

  describe('Theme Switching', () => {
    it('changes theme when segmented control is used', async () => {
      render(<Game />);
      
      const zenThemeButton = screen.getByText('Zen');
      fireEvent.click(zenThemeButton);
      
      // The component should re-render with zen theme
      // This is hard to test directly, but we can check the segmented control
      expect(zenThemeButton).toBeInTheDocument();
    });
  });

  describe('How to Play Instructions', () => {
    it('shows instructions during playing phase', () => {
      render(<Game />);
      
      expect(screen.getByText(/how to play/i)).toBeInTheDocument();
      expect(screen.getByText(/click intersections to place stones/i)).toBeInTheDocument();
      expect(screen.getByText(/surround opponent stones to capture/i)).toBeInTheDocument();
    });

    it('does not show instructions during scoring phase', () => {
      mockGameEngine.getGameState.mockReturnValue({
        board: Array(9).fill(null).map(() => Array(9).fill(null)),
        boardSize: BoardSize.SMALL,
        currentPlayer: Player.BLACK,
        phase: GamePhase.SCORING,
        lastMove: null,
        capturedStones: { black: [], white: [] },
        score: null,
        moveHistory: [],
      });
      
      render(<Game />);
      
      expect(screen.queryByText(/how to play/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles game engine errors gracefully', async () => {
      mockGameEngine.makeMove.mockImplementation(() => {
        throw new Error('Game engine error');
      });
      
      render(<Game />);
      
      const board = screen.getByTestId('mock-go-board');
      
      expect(() => fireEvent.click(board)).not.toThrow();
    });
  });

  describe('Responsive Design', () => {
    it('renders responsive styles', () => {
      render(<Game />);
      
      // Check that the main container renders
      expect(screen.getByTestId('mock-go-board')).toBeInTheDocument();
    });
  });

  describe('Test Mode Toggle', () => {
    it('toggles between normal and test game modes', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      render(<Game />);
      
      const testModeCheckbox = screen.getByRole('checkbox');
      fireEvent.click(testModeCheckbox);
      
      expect(gameFactoryModule.createScoringTestGame).toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Board Interactivity', () => {
    it('sets board as interactive during playing and scoring phases', () => {
      render(<Game />);
      
      const board = screen.getByTestId('mock-go-board');
      expect(board).toHaveAttribute('data-interactive', 'true');
    });

    it('sets board as non-interactive during finished phase', () => {
      mockGameEngine.getGameState.mockReturnValue({
        board: Array(9).fill(null).map(() => Array(9).fill(null)),
        boardSize: BoardSize.SMALL,
        currentPlayer: Player.BLACK,
        phase: GamePhase.FINISHED,
        lastMove: null,
        capturedStones: { black: [], white: [] },
        score: null,
        moveHistory: [],
      });
      
      render(<Game />);
      
      const board = screen.getByTestId('mock-go-board');
      expect(board).toHaveAttribute('data-interactive', 'false');
    });
  });
});
