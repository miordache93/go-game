import { useState, useCallback } from 'react';
import {
  Grid,
  Container,
  Title,
  Text,
  Alert,
  Stack,
  SegmentedControl,
  Group,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconInfoCircle, IconPalette } from '@tabler/icons-react';
import { GoBoard } from './GoBoard';
import { GameControls } from './GameControls';
import { GameEngine } from '../game';
import { createBeginnerGame } from '../game-factory';
import { Player, MoveType, Position, BoardSize } from '@go-game/types';

interface GameProps {
  /** Initial board size */
  boardSize?: BoardSize;
  /** Board theme */
  boardTheme?: 'classic' | 'modern' | 'zen';
}

/**
 * Main Game Component
 *
 * Complete GO game interface that integrates:
 * - Game engine with rule enforcement
 * - Interactive board rendering
 * - Game controls and status
 * - Move validation and feedback
 * - New game functionality
 */
export function Game({
  boardSize = BoardSize.SMALL,
  boardTheme = 'modern', // Modern theme for better visual impact
}: GameProps) {
  // Theme state
  const [currentTheme, setCurrentTheme] = useState<
    'classic' | 'modern' | 'zen'
  >(boardTheme);
  // Initialize game engine with demo stones
  const [gameEngine, setGameEngine] = useState<GameEngine>(() => {
    const engine = createBeginnerGame();

    // Add demo stones to showcase the board
    console.log('🎮 Placing demo stones...');
    const moves = [
      { player: Player.BLACK, pos: { x: 2, y: 2 } },
      { player: Player.WHITE, pos: { x: 6, y: 2 } },
      { player: Player.BLACK, pos: { x: 2, y: 6 } },
      { player: Player.WHITE, pos: { x: 6, y: 6 } },
      { player: Player.BLACK, pos: { x: 4, y: 4 } },
    ];

    moves.forEach(({ player, pos }) => {
      const result = engine.makeMove(player, MoveType.PLACE_STONE, pos);
      console.log(
        `🔷 Move ${player} at (${pos.x},${pos.y}):`,
        result.success ? '✅' : '❌',
        result.error || ''
      );
    });

    console.log('📋 Final board state:', engine.getGameState().board);
    return engine;
  });

  // Force re-render counter
  const [refreshKey, setRefreshKey] = useState(0);

  // Force refresh function
  const forceRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  // Responsive board size - CSS will handle the viewport responsiveness
  const getBoardSize = () => {
    // Base size that works well - CSS and flexbox will make it responsive
    return 450;
  };

  // Get current game state
  const gameState = gameEngine.getGameState();

  // Handle stone placement
  const handleIntersectionClick = useCallback(
    (position: Position) => {
      console.log(
        `🖱️ Click at (${position.x},${position.y}) by ${gameState.currentPlayer}`
      );

      const result = gameEngine.makeMove(
        gameState.currentPlayer,
        MoveType.PLACE_STONE,
        position
      );

      console.log('📋 Move result:', result);

      if (result.success) {
        console.log('✅ Move successful!');

        // Show capture notification if stones were captured
        if (result.capturedStones && result.capturedStones.length > 0) {
          notifications.show({
            title: '🎯 Stones Captured!',
            message: `${result.capturedStones.length} ${
              result.capturedStones.length === 1 ? 'stone' : 'stones'
            } captured`,
            color: 'orange',
            autoClose: 3000,
          });
        }

        // Show success notification
        notifications.show({
          title: '🎯 Stone Placed!',
          message: `${
            gameState.currentPlayer === Player.BLACK ? 'Black' : 'White'
          } stone placed`,
          color: 'green',
          autoClose: 2000,
        });

        // Force re-render
        forceRefresh();
      } else {
        console.log('❌ Move failed:', result.error);

        // Show error notification
        notifications.show({
          title: '❌ Invalid Move',
          message: result.error || 'That move is not allowed',
          color: 'red',
          autoClose: 4000,
        });
      }
    },
    [gameEngine, gameState.currentPlayer, forceRefresh]
  );

  // Handle pass move
  const handlePass = useCallback(() => {
    const result = gameEngine.makeMove(gameState.currentPlayer, MoveType.PASS);

    if (result.success) {
      notifications.show({
        title: '⏭️ Pass',
        message: `${
          gameState.currentPlayer === Player.BLACK ? 'Black' : 'White'
        } passed`,
        color: 'blue',
        autoClose: 2000,
      });

      // Check if game ended
      if (gameEngine.getGamePhase() !== gameState.phase) {
        notifications.show({
          title: '🏁 Game Phase Changed',
          message: 'Two consecutive passes - entering scoring phase',
          color: 'yellow',
          autoClose: 5000,
        });
      }

      forceRefresh();
    }
  }, [gameEngine, gameState.currentPlayer, gameState.phase, forceRefresh]);

  // Handle resign
  const handleResign = useCallback(() => {
    const result = gameEngine.makeMove(
      gameState.currentPlayer,
      MoveType.RESIGN
    );

    if (result.success) {
      const winner =
        gameState.currentPlayer === Player.BLACK ? 'White' : 'Black';
      notifications.show({
        title: '🏆 Game Over',
        message: `${
          gameState.currentPlayer === Player.BLACK ? 'Black' : 'White'
        } resigned. ${winner} wins!`,
        color: 'red',
        autoClose: false,
      });

      forceRefresh();
    }
  }, [gameEngine, gameState.currentPlayer, forceRefresh]);

  // Handle new game
  const handleNewGame = useCallback(() => {
    const newEngine = createBeginnerGame();
    setGameEngine(newEngine);

    notifications.show({
      title: '🆕 New Game',
      message: 'Starting a fresh game. Black plays first!',
      color: 'green',
      autoClose: 3000,
    });
  }, []);

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .game-container {
            flex-direction: column !important;
            gap: 0.5rem !important;
          }
          .controls-sidebar {
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            max-height: 200px !important;
          }
        }
        @media (max-width: 480px) {
          .game-container {
            padding: 0.25rem !important;
          }
        }
      `}</style>
      <div
        style={{
          height: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '0.5rem',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Container
          size="xl"
          style={{
            maxWidth: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '0.5rem',
          }}
        >
          {/* Compact Header */}
          <Stack align="center" gap="xs" mb="sm" style={{ flexShrink: 0 }}>
            <Title
              order={1}
              style={{
                color: 'white',
                textAlign: 'center',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                textShadow: '0 4px 12px rgba(0,0,0,0.3)',
                fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                margin: 0,
              }}
            >
              ⚫ GO Game ⚪
            </Title>

            {/* Theme Switcher - More Compact */}
            <Group justify="center" align="center" gap="xs">
              <IconPalette size={16} color="white" />
              <SegmentedControl
                className="theme-switcher"
                value={currentTheme}
                onChange={(value) =>
                  setCurrentTheme(value as 'classic' | 'modern' | 'zen')
                }
                data={[
                  { label: 'Classic', value: 'classic' },
                  { label: 'Modern', value: 'modern' },
                  { label: 'Zen', value: 'zen' },
                ]}
                size="sm"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)',
                }}
                styles={{
                  root: { border: '1px solid rgba(255,255,255,0.3)' },
                }}
              />
            </Group>
          </Stack>

          {/* Main Game Area - Responsive */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              gap: '1rem',
              background: 'rgba(255,255,255,0.95)',
              borderRadius: '16px',
              padding: '0.5rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              backdropFilter: 'blur(10px)',
              overflow: 'hidden',
              minHeight: 0,
              flexDirection: 'row',
            }}
            className="game-container"
          >
            {/* Game Board - Responsive Flex */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minWidth: 0, // Important for flex
              }}
            >
              <GoBoard
                board={gameState.board}
                boardSize={gameState.boardSize}
                currentPlayer={gameState.currentPlayer}
                theme={currentTheme}
                width={getBoardSize()}
                height={getBoardSize()}
                lastMove={gameState.lastMove?.position}
                onIntersectionClick={handleIntersectionClick}
                interactive={gameEngine.getGamePhase() === 'playing'}
                key={`${refreshKey}-${currentTheme}`}
              />
            </div>

            {/* Game Controls - Responsive Sidebar */}
            <div
              style={{
                width: '280px',
                minWidth: '250px',
                maxWidth: '300px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                overflowY: 'auto',
              }}
              className="controls-sidebar"
            >
              <GameControls
                currentPlayer={gameState.currentPlayer}
                gamePhase={gameState.phase}
                capturedStones={gameEngine.getCapturedStones()}
                onPass={handlePass}
                onResign={handleResign}
                onNewGame={handleNewGame}
              />

              {/* Compact Game Information */}
              <Alert
                icon={<IconInfoCircle size={16} />}
                title="How to Play"
                variant="light"
                color="blue"
                style={{
                  background: '#e3f2fd',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '0.875rem',
                }}
              >
                <Stack gap="xs">
                  <Text size="xs" fw={500}>
                    🎯 Click intersections to place stones
                  </Text>
                  <Text size="xs" fw={500}>
                    🔄 Surround opponent stones to capture
                  </Text>
                  <Text size="xs" fw={500}>
                    ⏭️ Pass when you don't want to move
                  </Text>
                  <Text size="xs" fw={500}>
                    🏁 Two passes end the game
                  </Text>
                </Stack>
              </Alert>
            </div>
          </div>
        </Container>
      </div>
    </>
  );
}

export default Game;
