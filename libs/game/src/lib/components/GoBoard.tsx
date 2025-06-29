import { useCallback, useMemo, useState } from 'react';
import { Stage, Layer, Line, Circle, Text, Rect, Group } from 'react-konva';
import { Board, BoardSize, Player, Position } from '@go-game/types';

interface GoBoardProps {
  /** Board state matrix */
  board: Board;
  /** Size of the board (9x9, 13x13, 19x19) */
  boardSize: BoardSize;
  /** Current player for move preview */
  currentPlayer: Player;
  /** Visual theme */
  theme?: 'classic' | 'modern' | 'zen';
  /** Board width in pixels */
  width?: number;
  /** Board height in pixels */
  height?: number;
  /** Position of the last move to highlight */
  lastMove?: Position;
  /** Whether the board accepts interaction */
  interactive?: boolean;
  /** Callback when an intersection is clicked */
  onIntersectionClick?: (position: Position) => void;
}

/**
 * GO Board Component with Canvas Rendering
 *
 * Features:
 * - High-performance Konva canvas rendering
 * - Fully responsive design
 * - Touch-friendly mobile support
 * - Multiple visual themes
 * - Interactive stone placement with preview
 * - Last move highlighting
 * - Star point markers
 */
export function GoBoard({
  board,
  boardSize,
  currentPlayer,
  theme = 'classic',
  width = 500,
  height = 500,
  lastMove,
  interactive = true,
  onIntersectionClick,
}: GoBoardProps) {
  const [hoverPosition, setHoverPosition] = useState<Position | null>(null);

  // Responsive sizing - allow much larger boards
  const containerSize = Math.min(width, height);
  const actualSize = Math.min(containerSize, 1200); // Allow up to 1200px for large screens
  const margin = actualSize * 0.06; // Smaller margin for larger boards
  const boardWidth = actualSize - 2 * margin;

  const size = boardSize;
  const cellSize = boardWidth / (size - 1);

  // Theme configurations
  const themes = useMemo(
    () => ({
      classic: {
        background: '#DEB887', // Burlywood
        lineColor: '#8B4513', // SaddleBrown
        starColor: '#8B4513',
        blackStone: '#2C2C2C',
        whiteStone: '#F8F8FF',
        lastMoveMarker: '#FF6B35',
        boardShadow: 'rgba(139, 69, 19, 0.3)',
      },
      modern: {
        background: '#2C5F7B', // Solid color for Mantine compatibility
        lineColor: '#4A90A4',
        starColor: '#6BB6CD',
        blackStone: '#1A1A1A',
        whiteStone: '#FFFFFF',
        lastMoveMarker: '#00BCD4',
        boardShadow: 'rgba(0, 188, 212, 0.3)',
      },
      zen: {
        background: '#F0E68C', // Khaki
        lineColor: '#8FBC8F', // DarkSeaGreen
        starColor: '#556B2F',
        blackStone: '#2F4F4F',
        whiteStone: '#FFF8DC',
        lastMoveMarker: '#32CD32',
        boardShadow: 'rgba(85, 107, 47, 0.3)',
      },
    }),
    []
  );

  const currentTheme = themes[theme];

  // Star points for different board sizes
  const getStarPoints = useCallback((): Position[] => {
    switch (boardSize) {
      case BoardSize.SMALL: // 9x9
        return [
          { x: 2, y: 2 },
          { x: 6, y: 2 },
          { x: 4, y: 4 },
          { x: 2, y: 6 },
          { x: 6, y: 6 },
        ];
      case BoardSize.MEDIUM: // 13x13
        return [
          { x: 3, y: 3 },
          { x: 9, y: 3 },
          { x: 6, y: 6 },
          { x: 3, y: 9 },
          { x: 9, y: 9 },
        ];
      case BoardSize.LARGE: // 19x19
        return [
          { x: 3, y: 3 },
          { x: 9, y: 3 },
          { x: 15, y: 3 },
          { x: 3, y: 9 },
          { x: 9, y: 9 },
          { x: 15, y: 9 },
          { x: 3, y: 15 },
          { x: 9, y: 15 },
          { x: 15, y: 15 },
        ];
      default:
        return [];
    }
  }, [boardSize]);

  // Convert board coordinates to canvas coordinates
  const boardToCanvas = useCallback(
    (position: Position) => {
      return {
        x: margin + position.x * cellSize,
        y: margin + position.y * cellSize,
      };
    },
    [margin, cellSize]
  );

  // Convert canvas coordinates to board coordinates
  const canvasToBoard = useCallback(
    (x: number, y: number): Position | null => {
      const boardX = (x - margin) / cellSize;
      const boardY = (y - margin) / cellSize;

      const posX = Math.round(boardX);
      const posY = Math.round(boardY);

      // Check if position is within bounds and close enough to intersection
      if (
        posX >= 0 &&
        posX < size &&
        posY >= 0 &&
        posY < size &&
        Math.abs(boardX - posX) < 0.3 &&
        Math.abs(boardY - posY) < 0.3
      ) {
        return { x: posX, y: posY };
      }

      return null;
    },
    [margin, cellSize, size]
  );

  // Handle mouse/touch events
  const handleMouseMove = useCallback(
    (e: any) => {
      if (!interactive) return;

      const pos = e.target.getStage().getPointerPosition();
      const boardPos = canvasToBoard(pos.x, pos.y);

      // Only show hover if intersection is empty
      if (boardPos && board[boardPos.y][boardPos.x] === null) {
        setHoverPosition(boardPos);
      } else {
        setHoverPosition(null);
      }
    },
    [interactive, canvasToBoard, board]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverPosition(null);
  }, []);

  const handleClick = useCallback(
    (e: any) => {
      console.log('🎯 Board clicked!', {
        interactive,
        hasHandler: !!onIntersectionClick,
      });

      if (!interactive || !onIntersectionClick) {
        console.log('❌ Click ignored - not interactive or no handler');
        return;
      }

      const pos = e.target.getStage().getPointerPosition();
      const boardPos = canvasToBoard(pos.x, pos.y);

      console.log('📍 Click position:', { screen: pos, board: boardPos });

      if (boardPos && board[boardPos.y][boardPos.x] === null) {
        console.log('✅ Valid click - calling handler');
        onIntersectionClick(boardPos);
        setHoverPosition(null);
      } else {
        console.log('❌ Invalid click - position occupied or out of bounds');
      }
    },
    [interactive, onIntersectionClick, canvasToBoard, board]
  );

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0.5rem',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
        maxWidth: '100%',
        maxHeight: '100%',
        overflow: 'hidden',
        width: 'fit-content',
        height: 'fit-content',
      }}
    >
      <div
        style={{
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: `0 8px 24px ${currentTheme.boardShadow}`,
          background:
            theme === 'modern'
              ? 'linear-gradient(135deg, #2C5F7B 0%, #1A3D4F 100%)'
              : currentTheme.background,
        }}
      >
        <Stage
          width={actualSize}
          height={actualSize}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          onTap={handleClick} // Touch support
          style={{
            cursor: interactive ? 'crosshair' : 'default',
            display: 'block',
          }}
        >
          <Layer>
            {/* Board Background */}
            <Rect
              x={0}
              y={0}
              width={actualSize}
              height={actualSize}
              fill={currentTheme.background}
            />

            {/* Grid Lines */}
            {Array.from({ length: size }, (_, i) => (
              <Group key={`grid-${i}`}>
                {/* Horizontal lines */}
                <Line
                  points={[
                    margin,
                    margin + i * cellSize,
                    actualSize - margin,
                    margin + i * cellSize,
                  ]}
                  stroke={currentTheme.lineColor}
                  strokeWidth={i === 0 || i === size - 1 ? 3 : 1.5}
                  opacity={0.8}
                />
                {/* Vertical lines */}
                <Line
                  points={[
                    margin + i * cellSize,
                    margin,
                    margin + i * cellSize,
                    actualSize - margin,
                  ]}
                  stroke={currentTheme.lineColor}
                  strokeWidth={i === 0 || i === size - 1 ? 3 : 1.5}
                  opacity={0.8}
                />
              </Group>
            ))}

            {/* Star Points */}
            {getStarPoints().map((starPoint, index) => {
              const { x, y } = boardToCanvas(starPoint);
              return (
                <Circle
                  key={`star-${index}`}
                  x={x}
                  y={y}
                  radius={cellSize * 0.08}
                  fill={currentTheme.starColor}
                  opacity={0.8}
                />
              );
            })}

            {/* Placed Stones */}
            {board.map((row, rowIndex) =>
              row.map((stone, colIndex) => {
                if (stone === null) return null;

                const { x, y } = boardToCanvas({
                  x: colIndex,
                  y: rowIndex,
                });
                const isLastMove =
                  lastMove &&
                  lastMove.y === rowIndex &&
                  lastMove.x === colIndex;
                const stoneRadius = cellSize * 0.4; // Slightly smaller for better visibility

                console.log(
                  `🔹 Rendering stone at (${colIndex},${rowIndex}) -> canvas (${x},${y}) player: ${stone.player}`
                );

                return (
                  <Group key={`stone-${rowIndex}-${colIndex}`}>
                    {/* Stone Shadow */}
                    <Circle
                      x={x + 3}
                      y={y + 3}
                      radius={stoneRadius}
                      fill="rgba(0,0,0,0.4)"
                      opacity={0.7}
                    />

                    {/* Main Stone */}
                    <Circle
                      x={x}
                      y={y}
                      radius={stoneRadius}
                      fill={
                        stone.player === Player.BLACK
                          ? currentTheme.blackStone
                          : currentTheme.whiteStone
                      }
                      stroke={stone.player === Player.BLACK ? '#000' : '#999'}
                      strokeWidth={2}
                    />

                    {/* Stone highlight border for better visibility */}
                    <Circle
                      x={x}
                      y={y}
                      radius={stoneRadius + 2}
                      fill="transparent"
                      stroke={stone.player === Player.BLACK ? '#333' : '#ddd'}
                      strokeWidth={1}
                      opacity={0.8}
                    />

                    {/* Last Move Marker */}
                    {isLastMove && (
                      <Circle
                        x={x}
                        y={y}
                        radius={stoneRadius * 0.3}
                        fill={currentTheme.lastMoveMarker}
                        opacity={0.9}
                      />
                    )}
                  </Group>
                );
              })
            )}

            {/* Hover Preview Stone */}
            {hoverPosition && (
              <Group>
                <Circle
                  x={boardToCanvas(hoverPosition).x}
                  y={boardToCanvas(hoverPosition).y}
                  radius={cellSize * 0.45}
                  fill={
                    currentPlayer === Player.BLACK
                      ? currentTheme.blackStone
                      : currentTheme.whiteStone
                  }
                  opacity={0.5}
                  stroke={currentPlayer === Player.BLACK ? '#000' : '#ccc'}
                  strokeWidth={2}
                  dash={[5, 5]}
                />
              </Group>
            )}

            {/* Coordinate Labels (for larger boards) */}
            {size >= 13 && (
              <Group>
                {/* Column labels (A-T, skipping I) */}
                {Array.from({ length: size }, (_, i) => {
                  const letter = String.fromCharCode(65 + i + (i >= 8 ? 1 : 0)); // Skip 'I'
                  const x = margin + i * cellSize;
                  return (
                    <Group key={`col-label-${i}`}>
                      <Text
                        x={x - 8}
                        y={margin - 25}
                        text={letter}
                        fontSize={12}
                        fill={currentTheme.lineColor}
                        fontStyle="bold"
                      />
                      <Text
                        x={x - 8}
                        y={actualSize - margin + 10}
                        text={letter}
                        fontSize={12}
                        fill={currentTheme.lineColor}
                        fontStyle="bold"
                      />
                    </Group>
                  );
                })}

                {/* Row labels (1-19) */}
                {Array.from({ length: size }, (_, i) => {
                  const number = size - i;
                  const y = margin + i * cellSize;
                  return (
                    <Group key={`row-label-${i}`}>
                      <Text
                        x={margin - 20}
                        y={y - 6}
                        text={number.toString()}
                        fontSize={12}
                        fill={currentTheme.lineColor}
                        fontStyle="bold"
                      />
                      <Text
                        x={actualSize - margin + 8}
                        y={y - 6}
                        text={number.toString()}
                        fontSize={12}
                        fill={currentTheme.lineColor}
                        fontStyle="bold"
                      />
                    </Group>
                  );
                })}
              </Group>
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}

export default GoBoard;
