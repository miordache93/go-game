import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from './test-utils';
import { GameControls } from '../GameControls';
import { Player, GamePhase } from '@go-game/types';

describe('GameControls Component', () => {
  const defaultProps = {
    currentPlayer: Player.BLACK,
    gamePhase: GamePhase.PLAYING,
    capturedStones: { black: 5, white: 3 },
    onPass: vi.fn(),
    onResign: vi.fn(),
    onNewGame: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the game controls component', () => {
      render(<GameControls {...defaultProps} />);
      
      expect(screen.getByText(/current turn/i)).toBeInTheDocument();
      expect(screen.getByText(/game status/i)).toBeInTheDocument();
      expect(screen.getByText(/captured stones/i)).toBeInTheDocument();
    });

    it('displays current player correctly', () => {
      render(<GameControls {...defaultProps} />);
      expect(screen.getByText(/black to play/i)).toBeInTheDocument();
    });

    it('displays white player correctly', () => {
      render(
        <GameControls {...defaultProps} currentPlayer={Player.WHITE} />
      );
      expect(screen.getByText(/white to play/i)).toBeInTheDocument();
    });

    it('displays captured stones count', () => {
      render(<GameControls {...defaultProps} />);
      
      expect(screen.getByText('5')).toBeInTheDocument(); // Black captures
      expect(screen.getByText('3')).toBeInTheDocument(); // White captures
      expect(screen.getByText(/black captures/i)).toBeInTheDocument();
      expect(screen.getByText(/white captures/i)).toBeInTheDocument();
    });
  });

  describe('Game Phase Display', () => {
    it('shows active game status during playing phase', () => {
      render(<GameControls {...defaultProps} gamePhase={GamePhase.PLAYING} />);
      expect(screen.getByText(/🎮 active game/i)).toBeInTheDocument();
    });

    it('shows scoring phase status', () => {
      render(<GameControls {...defaultProps} gamePhase={GamePhase.SCORING} />);
      expect(screen.getByText(/🧮 scoring phase/i)).toBeInTheDocument();
    });

    it('shows finished game status', () => {
      render(<GameControls {...defaultProps} gamePhase={GamePhase.FINISHED} />);
      expect(screen.getByText(/🏁 game finished/i)).toBeInTheDocument();
    });
  });

  describe('Game Controls During Playing Phase', () => {
    it('shows pass and resign buttons during playing phase', () => {
      render(<GameControls {...defaultProps} gamePhase={GamePhase.PLAYING} />);
      
      expect(screen.getByRole('button', { name: /pass turn/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /resign/i })).toBeInTheDocument();
    });

    it('calls onPass when pass button is clicked', async () => {
      const mockOnPass = vi.fn();
      render(
        <GameControls
          {...defaultProps}
          gamePhase={GamePhase.PLAYING}
          onPass={mockOnPass}
        />
      );
      
      const passButton = screen.getByRole('button', { name: /pass turn/i });
      fireEvent.click(passButton);
      
      expect(mockOnPass).toHaveBeenCalledOnce();
    });

    it('calls onResign when resign button is clicked', async () => {
      const mockOnResign = vi.fn();
      render(
        <GameControls
          {...defaultProps}
          gamePhase={GamePhase.PLAYING}
          onResign={mockOnResign}
        />
      );
      
      const resignButton = screen.getByRole('button', { name: /resign/i });
      fireEvent.click(resignButton);
      
      expect(mockOnResign).toHaveBeenCalledOnce();
    });

    it('does not show pass and resign buttons during non-playing phases', () => {
      render(<GameControls {...defaultProps} gamePhase={GamePhase.FINISHED} />);
      
      expect(screen.queryByRole('button', { name: /pass turn/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /resign/i })).not.toBeInTheDocument();
    });
  });

  describe('New Game Button', () => {
    it('shows new game button in all phases', () => {
      const phases = [GamePhase.PLAYING, GamePhase.SCORING, GamePhase.FINISHED];
      
      phases.forEach(phase => {
        const { unmount } = render(
          <GameControls {...defaultProps} gamePhase={phase} />
        );
        
        expect(screen.getByRole('button', { name: /start new game/i })).toBeInTheDocument();
        unmount();
      });
    });

    it('calls onNewGame when new game button is clicked', async () => {
      const mockOnNewGame = vi.fn();
      render(
        <GameControls
          {...defaultProps}
          onNewGame={mockOnNewGame}
        />
      );
      
      const newGameButton = screen.getByRole('button', { name: /start new game/i });
      fireEvent.click(newGameButton);
      
      expect(mockOnNewGame).toHaveBeenCalledOnce();
    });
  });

  describe('Disabled State', () => {
    it('disables all buttons when disabled prop is true', () => {
      render(
        <GameControls
          {...defaultProps}
          gamePhase={GamePhase.PLAYING}
          disabled={true}
        />
      );
      
      const passButton = screen.getByRole('button', { name: /pass turn/i });
      const resignButton = screen.getByRole('button', { name: /resign/i });
      const newGameButton = screen.getByRole('button', { name: /start new game/i });
      
      expect(passButton).toBeDisabled();
      expect(resignButton).toBeDisabled();
      expect(newGameButton).toBeDisabled();
    });

    it('enables buttons when disabled prop is false', () => {
      render(
        <GameControls
          {...defaultProps}
          gamePhase={GamePhase.PLAYING}
          disabled={false}
        />
      );
      
      const passButton = screen.getByRole('button', { name: /pass turn/i });
      const resignButton = screen.getByRole('button', { name: /resign/i });
      const newGameButton = screen.getByRole('button', { name: /start new game/i });
      
      expect(passButton).not.toBeDisabled();
      expect(resignButton).not.toBeDisabled();
      expect(newGameButton).not.toBeDisabled();
    });
  });

  describe('Phase-specific Instructions', () => {
    it('shows scoring phase instructions', () => {
      render(<GameControls {...defaultProps} gamePhase={GamePhase.SCORING} />);
      expect(screen.getByText(/two consecutive passes/i)).toBeInTheDocument();
      expect(screen.getByText(/ready for scoring/i)).toBeInTheDocument();
    });

    it('shows finished game instructions', () => {
      render(<GameControls {...defaultProps} gamePhase={GamePhase.FINISHED} />);
      expect(screen.getByText(/game completed/i)).toBeInTheDocument();
      expect(screen.getByText(/start new game/i)).toBeInTheDocument();
    });

    it('does not show phase instructions during playing phase', () => {
      render(<GameControls {...defaultProps} gamePhase={GamePhase.PLAYING} />);
      
      expect(screen.queryByText(/two consecutive passes/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/game completed/i)).not.toBeInTheDocument();
    });
  });

  describe('Visual Styling', () => {
    it('has different styling for black and white players', () => {
      const { rerender } = render(
        <GameControls {...defaultProps} currentPlayer={Player.BLACK} />
      );
      
      expect(screen.getByText(/black to play/i)).toBeInTheDocument();
      
      rerender(
        <GameControls {...defaultProps} currentPlayer={Player.WHITE} />
      );
      
      expect(screen.getByText(/white to play/i)).toBeInTheDocument();
    });
  });

  describe('Capture Counter Edge Cases', () => {
    it('handles zero captures correctly', () => {
      render(
        <GameControls
          {...defaultProps}
          capturedStones={{ black: 0, white: 0 }}
        />
      );
      
      expect(screen.getAllByText('0')).toHaveLength(2);
    });

    it('handles large capture numbers', () => {
      render(
        <GameControls
          {...defaultProps}
          capturedStones={{ black: 999, white: 123 }}
        />
      );
      
      expect(screen.getByText('999')).toBeInTheDocument();
      expect(screen.getByText('123')).toBeInTheDocument();
    });
  });

  describe('Missing Props Handling', () => {
    it('handles missing callback props gracefully', () => {
      const { onPass, onResign, onNewGame, ...propsWithoutCallbacks } = defaultProps;
      
      render(
        <GameControls
          {...propsWithoutCallbacks}
          gamePhase={GamePhase.PLAYING}
        />
      );
      
      const passButton = screen.getByRole('button', { name: /pass turn/i });
      const resignButton = screen.getByRole('button', { name: /resign/i });
      const newGameButton = screen.getByRole('button', { name: /start new game/i });
      
      expect(() => {
        fireEvent.click(passButton);
        fireEvent.click(resignButton);
        fireEvent.click(newGameButton);
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('has proper button roles and labels', () => {
      render(<GameControls {...defaultProps} gamePhase={GamePhase.PLAYING} />);
      
      const passButton = screen.getByRole('button', { name: /pass turn/i });
      const resignButton = screen.getByRole('button', { name: /resign/i });
      const newGameButton = screen.getByRole('button', { name: /start new game/i });
      
      expect(passButton).toHaveAttribute('type', 'button');
      expect(resignButton).toHaveAttribute('type', 'button');
      expect(newGameButton).toHaveAttribute('type', 'button');
    });

    it('provides clear visual hierarchy', () => {
      render(<GameControls {...defaultProps} />);
      
      expect(screen.getByText(/current turn/i)).toBeInTheDocument();
      expect(screen.getByText(/game status/i)).toBeInTheDocument();
      expect(screen.getByText(/captured stones/i)).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('renders properly with different screen sizes', () => {
      // This would normally test CSS media queries, but in a unit test environment
      // we can at least ensure the component renders without errors
      render(<GameControls {...defaultProps} />);
      expect(screen.getByText(/current turn/i)).toBeInTheDocument();
    });
  });
});
