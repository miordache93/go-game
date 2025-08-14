import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from './test-utils';
import { ScoringControls } from '../ScoringControls';
import { Player } from '@go-game/types';

// Mock CSS modules
vi.mock('../game.module.scss', () => ({
  default: {
    scoringControls: 'scoring-controls',
    scoringTitle: 'scoring-title',
    scoringInstructions: 'scoring-instructions',
    scoreDisplay: 'score-display',
    playerScore: 'player-score',
    scoreDetails: 'score-details',
    scoreRow: 'score-row',
    totalScore: 'total-score',
    blackStone: 'black-stone',
    whiteStone: 'white-stone',
    winnerDisplay: 'winner-display',
    scoringActions: 'scoring-actions',
    button: 'button',
    primaryButton: 'primary-button',
    secondaryButton: 'secondary-button',
  },
}));

describe('ScoringControls Component', () => {
  const mockScore = {
    black: {
      territory: 15,
      captures: 8,
      total: 23,
    },
    white: {
      territory: 12,
      captures: 5,
      komi: 6.5,
      total: 23.5,
    },
    winner: Player.WHITE,
  };

  const defaultProps = {
    score: mockScore,
    onFinalize: vi.fn(),
    onResume: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders null when score is null', () => {
      const { container } = render(
        <ScoringControls
          {...defaultProps}
          score={null}
        />
      );
      
      expect(container.firstChild).toBeNull();
    });

    it('renders the scoring controls when score is provided', () => {
      render(<ScoringControls {...defaultProps} />);
      
      expect(screen.getByText(/scoring phase/i)).toBeInTheDocument();
      expect(screen.getByText(/click on stones to mark them as dead/i)).toBeInTheDocument();
    });

    it('renders scoring instructions', () => {
      render(<ScoringControls {...defaultProps} />);
      
      expect(screen.getByText(/click on stones to mark them as dead/i)).toBeInTheDocument();
      expect(screen.getByText(/dead stones will be added to captures/i)).toBeInTheDocument();
    });
  });

  describe('Score Display', () => {
    it('displays black player score correctly', () => {
      render(<ScoringControls {...defaultProps} />);
      
      expect(screen.getByText('Black')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument(); // territory
      expect(screen.getByText('8')).toBeInTheDocument();  // captures
      expect(screen.getByText('23')).toBeInTheDocument(); // total
    });

    it('displays white player score correctly', () => {
      render(<ScoringControls {...defaultProps} />);
      
      expect(screen.getByText('White')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument(); // territory
      expect(screen.getByText('5')).toBeInTheDocument();  // captures
      expect(screen.getByText('6.5')).toBeInTheDocument(); // komi
      expect(screen.getByText('23.5')).toBeInTheDocument(); // total
    });

    it('displays territory, captures, and total labels', () => {
      render(<ScoringControls {...defaultProps} />);
      
      expect(screen.getAllByText('Territory:')).toHaveLength(2);
      expect(screen.getAllByText('Captures:')).toHaveLength(2);
      expect(screen.getByText('Komi:')).toBeInTheDocument();
      expect(screen.getAllByText('Total:')).toHaveLength(2);
    });

    it('only shows komi for white player', () => {
      render(<ScoringControls {...defaultProps} />);
      
      // Komi should only appear once (for white player)
      expect(screen.getAllByText('Komi:')).toHaveLength(1);
      expect(screen.getByText('6.5')).toBeInTheDocument();
    });

    it('displays black and white stone symbols', () => {
      render(<ScoringControls {...defaultProps} />);
      
      // Check for stone symbols in the headings
      expect(screen.getByText('●')).toBeInTheDocument(); // Black stone symbol
      expect(screen.getByText('○')).toBeInTheDocument(); // White stone symbol
    });
  });

  describe('Winner Display', () => {
    it('shows white winner correctly', () => {
      render(<ScoringControls {...defaultProps} />);
      
      expect(screen.getByText(/white wins by 0.5 points/i)).toBeInTheDocument();
    });

    it('shows black winner correctly', () => {
      const blackWinScore = {
        ...mockScore,
        black: { ...mockScore.black, total: 30 },
        winner: Player.BLACK,
      };
      
      render(
        <ScoringControls
          {...defaultProps}
          score={blackWinScore}
        />
      );
      
      expect(screen.getByText(/black wins by 6.5 points/i)).toBeInTheDocument();
    });

    it('shows tie game correctly', () => {
      const tieScore = {
        ...mockScore,
        white: { ...mockScore.white, total: 23 },
        winner: null,
      };
      
      render(
        <ScoringControls
          {...defaultProps}
          score={tieScore}
        />
      );
      
      expect(screen.getByText(/tie game/i)).toBeInTheDocument();
    });

    it('calculates point margin correctly', () => {
      const largeMarginScore = {
        black: { territory: 30, captures: 10, total: 40 },
        white: { territory: 15, captures: 3, komi: 6.5, total: 24.5 },
        winner: Player.BLACK,
      };
      
      render(
        <ScoringControls
          {...defaultProps}
          score={largeMarginScore}
        />
      );
      
      expect(screen.getByText(/black wins by 15.5 points/i)).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('renders finalize and resume buttons', () => {
      render(<ScoringControls {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /accept.*finish game/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /resume playing/i })).toBeInTheDocument();
    });

    it('calls onFinalize when finalize button is clicked', () => {
      const mockOnFinalize = vi.fn();
      render(
        <ScoringControls
          {...defaultProps}
          onFinalize={mockOnFinalize}
        />
      );
      
      const finalizeButton = screen.getByRole('button', { name: /accept.*finish game/i });
      fireEvent.click(finalizeButton);
      
      expect(mockOnFinalize).toHaveBeenCalledOnce();
    });

    it('calls onResume when resume button is clicked', () => {
      const mockOnResume = vi.fn();
      render(
        <ScoringControls
          {...defaultProps}
          onResume={mockOnResume}
        />
      );
      
      const resumeButton = screen.getByRole('button', { name: /resume playing/i });
      fireEvent.click(resumeButton);
      
      expect(mockOnResume).toHaveBeenCalledOnce();
    });

    it('disables buttons when disabled prop is true', () => {
      render(
        <ScoringControls
          {...defaultProps}
          disabled={true}
        />
      );
      
      const finalizeButton = screen.getByRole('button', { name: /accept.*finish game/i });
      const resumeButton = screen.getByRole('button', { name: /resume playing/i });
      
      expect(finalizeButton).toBeDisabled();
      expect(resumeButton).toBeDisabled();
    });

    it('enables buttons when disabled prop is false', () => {
      render(
        <ScoringControls
          {...defaultProps}
          disabled={false}
        />
      );
      
      const finalizeButton = screen.getByRole('button', { name: /accept.*finish game/i });
      const resumeButton = screen.getByRole('button', { name: /resume playing/i });
      
      expect(finalizeButton).not.toBeDisabled();
      expect(resumeButton).not.toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero scores correctly', () => {
      const zeroScore = {
        black: { territory: 0, captures: 0, total: 0 },
        white: { territory: 0, captures: 0, komi: 6.5, total: 6.5 },
        winner: Player.WHITE,
      };
      
      render(
        <ScoringControls
          {...defaultProps}
          score={zeroScore}
        />
      );
      
      expect(screen.getAllByText('0')).toHaveLength(4); // Territory and captures for both players
      expect(screen.getByText('6.5')).toBeInTheDocument(); // Komi and white total
    });

    it('handles fractional scores correctly', () => {
      const fractionalScore = {
        black: { territory: 15.5, captures: 8, total: 23.5 },
        white: { territory: 12, captures: 5, komi: 6.5, total: 23.5 },
        winner: null, // Tie
      };
      
      render(
        <ScoringControls
          {...defaultProps}
          score={fractionalScore}
        />
      );
      
      expect(screen.getByText('15.5')).toBeInTheDocument();
      expect(screen.getAllByText('23.5')).toHaveLength(2);
      expect(screen.getByText(/tie game/i)).toBeInTheDocument();
    });

    it('handles very large scores correctly', () => {
      const largeScore = {
        black: { territory: 999, captures: 100, total: 1099 },
        white: { territory: 888, captures: 200, komi: 6.5, total: 1094.5 },
        winner: Player.BLACK,
      };
      
      render(
        <ScoringControls
          {...defaultProps}
          score={largeScore}
        />
      );
      
      expect(screen.getByText('999')).toBeInTheDocument();
      expect(screen.getByText('1099')).toBeInTheDocument();
      expect(screen.getByText(/black wins by 4.5 points/i)).toBeInTheDocument();
    });

    it('handles missing komi for white player', () => {
      const noKomiScore = {
        black: { territory: 15, captures: 8, total: 23 },
        white: { territory: 12, captures: 5, total: 17 }, // No komi property
        winner: Player.BLACK,
      };
      
      render(
        <ScoringControls
          {...defaultProps}
          score={noKomiScore}
        />
      );
      
      expect(screen.queryByText('Komi:')).not.toBeInTheDocument();
      expect(screen.getByText(/black wins by 6 points/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper button types', () => {
      render(<ScoringControls {...defaultProps} />);
      
      const finalizeButton = screen.getByRole('button', { name: /accept.*finish game/i });
      const resumeButton = screen.getByRole('button', { name: /resume playing/i });
      
      expect(finalizeButton).toHaveAttribute('type', 'button');
      expect(resumeButton).toHaveAttribute('type', 'button');
    });

    it('provides clear visual hierarchy with headings', () => {
      render(<ScoringControls {...defaultProps} />);
      
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument(); // Scoring Phase title
      expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(2); // Black and White headings
    });

    it('has descriptive button text', () => {
      render(<ScoringControls {...defaultProps} />);
      
      expect(screen.getByText(/accept.*finish game/i)).toBeInTheDocument();
      expect(screen.getByText(/resume playing/i)).toBeInTheDocument();
    });
  });

  describe('CSS Classes', () => {
    it('applies correct CSS classes', () => {
      const { container } = render(<ScoringControls {...defaultProps} />);
      
      expect(container.querySelector('.scoring-controls')).toBeInTheDocument();
      expect(container.querySelector('.scoring-title')).toBeInTheDocument();
      expect(container.querySelector('.score-display')).toBeInTheDocument();
      expect(container.querySelector('.scoring-actions')).toBeInTheDocument();
    });

    it('applies button styling classes', () => {
      const { container } = render(<ScoringControls {...defaultProps} />);
      
      expect(container.querySelector('.primary-button')).toBeInTheDocument();
      expect(container.querySelector('.secondary-button')).toBeInTheDocument();
    });
  });
});
