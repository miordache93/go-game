import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from './test-utils';
import { GoBoard } from '../GoBoard';
import { BoardSize, Player } from '@go-game/types';

// Mock react-konva components
vi.mock('react-konva', () => ({
  Stage: vi.fn(({ children, onClick, onMouseMove, onMouseLeave, onTap, ...props }) => {
    return (
      <div
        data-testid="konva-stage"
        onClick={onClick}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onTouchEnd={onTap}
        style={{ width: props.width, height: props.height }}
      >
        {children}
      </div>
    );
  }),
  Layer: vi.fn(({ children }) => <div data-testid="konva-layer">{children}</div>),
  Group: vi.fn(({ children }) => <div data-testid="konva-group">{children}</div>),
  Circle: vi.fn((props) => (
    <div
      data-testid="konva-circle"
      data-x={props.x}
      data-y={props.y}
      data-radius={props.radius}
      data-fill={props.fill}
      style={{ opacity: props.opacity }}
    />
  )),
  Line: vi.fn((props) => (
    <div
      data-testid="konva-line"
      data-points={props.points?.join(',')}
      data-stroke={props.stroke}
      data-stroke-width={props.strokeWidth}
    />
  )),
  Rect: vi.fn((props) => (
    <div
      data-testid="konva-rect"
      data-fill={props.fill}
      style={{ width: props.width, height: props.height }}
    />
  )),
  Text: vi.fn((props) => (
    <div
      data-testid="konva-text"
      data-text={props.text}
      data-font-size={props.fontSize}
    >
      {props.text}
    </div>
  )),
}));

describe('GoBoard Component', () => {
  const createEmptyBoard = (size: number) =>
    Array(size).fill(null).map(() => Array(size).fill(null));

  const createBoardWithStones = (size: number) => {
    const board = createEmptyBoard(size);
    // Add some test stones
    board[2][2] = { player: Player.BLACK };
    board[3][3] = { player: Player.WHITE };
    return board;
  };

  const defaultProps = {
    board: createEmptyBoard(9),
    boardSize: BoardSize.SMALL,
    currentPlayer: Player.BLACK,
    onIntersectionClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders the board component', () => {
      render(<GoBoard {...defaultProps} />);
      expect(screen.getByTestId('konva-stage')).toBeInTheDocument();
      expect(screen.getByTestId('konva-layer')).toBeInTheDocument();
    });

    it('renders with correct board size', () => {
      render(<GoBoard {...defaultProps} width={500} height={500} />);
      const stage = screen.getByTestId('konva-stage');
      expect(stage).toHaveStyle({ width: '500px', height: '500px' });
    });

    it('renders background rectangle', () => {
      render(<GoBoard {...defaultProps} />);
      expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
    });

    it('renders grid lines', () => {
      render(<GoBoard {...defaultProps} />);
      const lines = screen.getAllByTestId('konva-line');
      // 9x9 board should have 18 lines (9 horizontal + 9 vertical)
      expect(lines).toHaveLength(18);
    });

    it('renders star points for small board', () => {
      render(<GoBoard {...defaultProps} />);
      const circles = screen.getAllByTestId('konva-circle');
      // Small board (9x9) has 5 star points
      expect(circles.length).toBeGreaterThanOrEqual(5);
    });

    it('renders coordinate labels for large boards', () => {
      const largeBoard = createEmptyBoard(19);
      render(
        <GoBoard
          {...defaultProps}
          board={largeBoard}
          boardSize={BoardSize.LARGE}
        />
      );
      const texts = screen.getAllByTestId('konva-text');
      expect(texts.length).toBeGreaterThan(0);
    });
  });

  describe('Stone Rendering', () => {
    it('renders placed stones', () => {
      const boardWithStones = createBoardWithStones(9);
      render(<GoBoard {...defaultProps} board={boardWithStones} />);
      
      const circles = screen.getAllByTestId('konva-circle');
      // Should have star points + placed stones + shadows
      expect(circles.length).toBeGreaterThan(5); // More than just star points
    });

    it('renders black and white stones with different colors', () => {
      const boardWithStones = createBoardWithStones(9);
      render(<GoBoard {...defaultProps} board={boardWithStones} />);
      
      const circles = screen.getAllByTestId('konva-circle');
      const blackStones = circles.filter(circle => 
        circle.getAttribute('data-fill')?.includes('#2C2C2C') ||
        circle.getAttribute('data-fill')?.includes('#2d3748')
      );
      const whiteStones = circles.filter(circle => 
        circle.getAttribute('data-fill')?.includes('#F8F8FF') ||
        circle.getAttribute('data-fill')?.includes('#f7fafc')
      );
      
      expect(blackStones.length).toBeGreaterThan(0);
      expect(whiteStones.length).toBeGreaterThan(0);
    });

    it('highlights last move', () => {
      const boardWithStones = createBoardWithStones(9);
      render(
        <GoBoard
          {...defaultProps}
          board={boardWithStones}
          lastMove={{ x: 2, y: 2 }}
        />
      );
      
      const circles = screen.getAllByTestId('konva-circle');
      // Should find the last move marker circle
      const lastMoveMarker = circles.find(circle => 
        circle.getAttribute('data-fill')?.includes('#FF6B35') ||
        circle.getAttribute('data-fill')?.includes('#00BCD4')
      );
      expect(lastMoveMarker).toBeDefined();
    });

    it('renders dead stones with reduced opacity', () => {
      const boardWithStones = createBoardWithStones(9);
      const deadStones = new Set(['2,2']); // Mark stone at position (2,2) as dead
      
      render(
        <GoBoard
          {...defaultProps}
          board={boardWithStones}
          deadStones={deadStones}
        />
      );
      
      const circles = screen.getAllByTestId('konva-circle');
      const deadStone = circles.find(circle => 
        parseFloat(circle.style.opacity) < 1
      );
      expect(deadStone).toBeDefined();
    });
  });

  describe('Themes', () => {
    it('applies classic theme colors', () => {
      render(<GoBoard {...defaultProps} theme="classic" />);
      const rect = screen.getByTestId('konva-rect');
      expect(rect.getAttribute('data-fill')).toBe('#DEB887');
    });

    it('applies modern theme colors', () => {
      render(<GoBoard {...defaultProps} theme="modern" />);
      const rect = screen.getByTestId('konva-rect');
      expect(rect.getAttribute('data-fill')).toBe('#2C5F7B');
    });

    it('applies zen theme colors', () => {
      render(<GoBoard {...defaultProps} theme="zen" />);
      const rect = screen.getByTestId('konva-rect');
      expect(rect.getAttribute('data-fill')).toBe('#F0E68C');
    });
  });

  describe('Interaction', () => {
    it('calls onIntersectionClick when board is clicked', () => {
      const mockClick = vi.fn();
      render(<GoBoard {...defaultProps} onIntersectionClick={mockClick} />);
      
      const stage = screen.getByTestId('konva-stage');
      // Mock the event object that Konva would provide
      const mockEvent = {
        target: {
          getStage: () => ({
            getPointerPosition: () => ({ x: 100, y: 100 })
          })
        }
      };
      
      fireEvent.click(stage, mockEvent);
      expect(mockClick).toHaveBeenCalled();
    });

    it('does not call onIntersectionClick when interactive is false', () => {
      const mockClick = vi.fn();
      render(
        <GoBoard
          {...defaultProps}
          onIntersectionClick={mockClick}
          interactive={false}
        />
      );
      
      const stage = screen.getByTestId('konva-stage');
      fireEvent.click(stage);
      expect(mockClick).not.toHaveBeenCalled();
    });

    it('shows hover preview when mouse moves over board', async () => {
      render(<GoBoard {...defaultProps} interactive={true} />);
      
      const stage = screen.getByTestId('konva-stage');
      const mockEvent = {
        target: {
          getStage: () => ({
            getPointerPosition: () => ({ x: 100, y: 100 })
          })
        }
      };
      
      fireEvent.mouseMove(stage, mockEvent);
      
      // Wait for potential state updates
      await waitFor(() => {
        const circles = screen.getAllByTestId('konva-circle');
        // Should have preview stone (with reduced opacity)
        const previewStone = circles.find(circle => 
          parseFloat(circle.style.opacity) === 0.5
        );
        expect(previewStone).toBeDefined();
      });
    });

    it('clears hover preview when mouse leaves board', async () => {
      render(<GoBoard {...defaultProps} interactive={true} />);
      
      const stage = screen.getByTestId('konva-stage');
      
      // First hover
      const hoverEvent = {
        target: {
          getStage: () => ({
            getPointerPosition: () => ({ x: 100, y: 100 })
          })
        }
      };
      fireEvent.mouseMove(stage, hoverEvent);
      
      // Then leave
      fireEvent.mouseLeave(stage);
      
      await waitFor(() => {
        const circles = screen.getAllByTestId('konva-circle');
        const previewStone = circles.find(circle => 
          parseFloat(circle.style.opacity) === 0.5
        );
        expect(previewStone).toBeUndefined();
      });
    });
  });

  describe('Different Board Sizes', () => {
    it('renders small board (9x9)', () => {
      render(
        <GoBoard
          {...defaultProps}
          board={createEmptyBoard(9)}
          boardSize={BoardSize.SMALL}
        />
      );
      
      const lines = screen.getAllByTestId('konva-line');
      expect(lines).toHaveLength(18); // 9 horizontal + 9 vertical
    });

    it('renders medium board (13x13)', () => {
      render(
        <GoBoard
          {...defaultProps}
          board={createEmptyBoard(13)}
          boardSize={BoardSize.MEDIUM}
        />
      );
      
      const lines = screen.getAllByTestId('konva-line');
      expect(lines).toHaveLength(26); // 13 horizontal + 13 vertical
    });

    it('renders large board (19x19)', () => {
      render(
        <GoBoard
          {...defaultProps}
          board={createEmptyBoard(19)}
          boardSize={BoardSize.LARGE}
        />
      );
      
      const lines = screen.getAllByTestId('konva-line');
      expect(lines).toHaveLength(38); // 19 horizontal + 19 vertical
    });
  });

  describe('Accessibility', () => {
    it('has proper cursor style when interactive', () => {
      render(<GoBoard {...defaultProps} interactive={true} />);
      const stage = screen.getByTestId('konva-stage');
      expect(stage.style.cursor).toBe('crosshair');
    });

    it('has default cursor when not interactive', () => {
      render(<GoBoard {...defaultProps} interactive={false} />);
      const stage = screen.getByTestId('konva-stage');
      expect(stage.style.cursor).toBe('default');
    });
  });

  describe('Touch Support', () => {
    it('supports touch events', () => {
      const mockClick = vi.fn();
      render(<GoBoard {...defaultProps} onIntersectionClick={mockClick} />);
      
      const stage = screen.getByTestId('konva-stage');
      const mockEvent = {
        target: {
          getStage: () => ({
            getPointerPosition: () => ({ x: 100, y: 100 })
          })
        }
      };
      
      fireEvent.touchEnd(stage, mockEvent);
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles empty board gracefully', () => {
      render(<GoBoard {...defaultProps} board={[]} />);
      expect(screen.getByTestId('konva-stage')).toBeInTheDocument();
    });

    it('handles missing onIntersectionClick prop', () => {
      const { onIntersectionClick, ...propsWithoutClick } = defaultProps;
      render(<GoBoard {...propsWithoutClick} />);
      
      const stage = screen.getByTestId('konva-stage');
      expect(() => fireEvent.click(stage)).not.toThrow();
    });
  });
});
