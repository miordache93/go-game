import { Group, Button, Text, Stack, Paper, Divider } from '@mantine/core';
import {
  IconFlag,
  IconArrowRight,
  IconRefresh,
  IconPlayerPlay,
  IconTrophy,
  IconTarget,
} from '@tabler/icons-react';
import { Player, GamePhase } from '@go-game/types';

interface GameControlsProps {
  /** Current player to move */
  currentPlayer: Player;
  /** Current game phase */
  gamePhase: GamePhase;
  /** Number of captures for each player */
  capturedStones: {
    black: number;
    white: number;
  };
  /** Callback for pass move */
  onPass?: () => void;
  /** Callback for resign */
  onResign?: () => void;
  /** Callback for new game */
  onNewGame?: () => void;
  /** Whether game controls are disabled */
  disabled?: boolean;
}

/**
 * Game Controls Component
 *
 * Modern 2025 design with gradients, better spacing, and visual hierarchy
 */
export function GameControls({
  currentPlayer,
  gamePhase,
  capturedStones,
  onPass,
  onResign,
  onNewGame,
  disabled = false,
}: GameControlsProps) {
  const isGameActive = gamePhase === GamePhase.PLAYING;
  const isGameFinished = gamePhase === GamePhase.FINISHED;

  const getPlayerBackground = (player: Player) => {
    return player === Player.BLACK
      ? '#2d3748' // Solid color instead of gradient
      : '#f7fafc'; // Solid color instead of gradient
  };

  const getPlayerTextColor = (player: Player) => {
    return player === Player.BLACK ? 'white' : '#2d3748';
  };

  const getGamePhaseColor = () => {
    switch (gamePhase) {
      case GamePhase.PLAYING:
        return '#48bb78'; // Solid color instead of gradient
      case GamePhase.SCORING:
        return '#ed8936'; // Solid color instead of gradient
      case GamePhase.FINISHED:
        return '#e53e3e'; // Solid color instead of gradient
      default:
        return '#4299e1'; // Solid color instead of gradient
    }
  };

  const getGamePhaseText = () => {
    switch (gamePhase) {
      case GamePhase.PLAYING:
        return '🎮 Active Game';
      case GamePhase.SCORING:
        return '🧮 Scoring Phase';
      case GamePhase.FINISHED:
        return '🏁 Game Finished';
      default:
        return '❓ Unknown Phase';
    }
  };

  return (
    <Paper
      p="xl"
      style={{
        background: '#ffffff', // Solid color instead of gradient
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
      }}
    >
      <Stack gap="lg">
        {/* Current Player - Large Display */}
        <div>
          <Text
            size="sm"
            c="#6b7280"
            mb="sm"
            fw={600}
            tt="uppercase"
            style={{ letterSpacing: '0.5px' }}
          >
            Current Turn
          </Text>
          <Paper
            p="lg"
            style={{
              background: getPlayerBackground(currentPlayer),
              borderRadius: '16px',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <Group justify="center" gap="sm">
              <IconPlayerPlay
                size={24}
                color={getPlayerTextColor(currentPlayer)}
              />
              <Text
                size="xl"
                fw={700}
                style={{
                  color: getPlayerTextColor(currentPlayer),
                  textShadow:
                    currentPlayer === Player.BLACK
                      ? '0 1px 2px rgba(0,0,0,0.3)'
                      : 'none',
                }}
              >
                {currentPlayer === Player.BLACK ? 'Black' : 'White'} to Play
              </Text>
            </Group>
          </Paper>
        </div>

        <Divider variant="dashed" />

        {/* Game Status */}
        <div>
          <Text
            size="sm"
            c="#6b7280"
            mb="sm"
            fw={600}
            tt="uppercase"
            style={{ letterSpacing: '0.5px' }}
          >
            Game Status
          </Text>
          <Paper
            p="md"
            style={{
              background: getGamePhaseColor(),
              borderRadius: '12px',
              textAlign: 'center',
            }}
          >
            <Text
              size="lg"
              fw={600}
              c="white"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
            >
              {getGamePhaseText()}
            </Text>
          </Paper>
        </div>

        {/* Capture Counts */}
        <div>
          <Text
            size="sm"
            c="#6b7280"
            mb="sm"
            fw={600}
            tt="uppercase"
            style={{ letterSpacing: '0.5px' }}
          >
            Captured Stones
          </Text>
          <Group justify="space-between">
            <Paper
              p="md"
              style={{
                background: '#2d3748', // Solid color instead of gradient
                borderRadius: '12px',
                flex: 1,
                marginRight: '8px',
              }}
            >
              <Group justify="center" gap="xs">
                <IconTarget size={20} color="white" />
                <Text c="white" fw={600} size="lg">
                  {capturedStones.black}
                </Text>
              </Group>
              <Text size="xs" c="#d1d5db" ta="center" mt="xs">
                Black Captures
              </Text>
            </Paper>

            <Paper
              p="md"
              style={{
                background: '#f7fafc', // Solid color instead of gradient
                borderRadius: '12px',
                flex: 1,
                marginLeft: '8px',
                border: '2px solid #e2e8f0',
              }}
            >
              <Group justify="center" gap="xs">
                <IconTarget size={20} color="#2d3748" />
                <Text c="#2d3748" fw={600} size="lg">
                  {capturedStones.white}
                </Text>
              </Group>
              <Text size="xs" c="#6b7280" ta="center" mt="xs">
                White Captures
              </Text>
            </Paper>
          </Group>
        </div>

        <Divider variant="dashed" />

        {/* Game Actions */}
        <Stack gap="md">
          {/* Active Game Controls */}
          {isGameActive && (
            <Group grow>
              <Button
                variant="filled"
                color="blue"
                leftSection={<IconArrowRight size={18} />}
                onClick={onPass}
                disabled={disabled}
                size="md"
                style={{
                  borderRadius: '12px',
                  fontWeight: 600,
                }}
              >
                Pass Turn
              </Button>

              <Button
                variant="filled"
                color="red"
                leftSection={<IconFlag size={18} />}
                onClick={onResign}
                disabled={disabled}
                size="md"
                style={{
                  borderRadius: '12px',
                  fontWeight: 600,
                }}
              >
                Resign
              </Button>
            </Group>
          )}

          {/* New Game Button */}
          <Button
            variant="filled"
            color="teal"
            leftSection={<IconRefresh size={20} />}
            onClick={onNewGame}
            disabled={disabled}
            size="lg"
            style={{
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '16px',
            }}
          >
            Start New Game
          </Button>
        </Stack>

        {/* Game Phase Instructions */}
        {gamePhase === GamePhase.SCORING && (
          <Paper
            p="md"
            style={{
              background: '#fef5e7', // Solid color instead of gradient
              borderRadius: '12px',
              border: '1px solid #f6ad55',
            }}
          >
            <Group gap="xs">
              <IconTrophy size={20} color="#c05621" />
              <Text size="sm" c="#c05621" fw={500}>
                Game ended with two consecutive passes. Ready for scoring!
              </Text>
            </Group>
          </Paper>
        )}

        {isGameFinished && (
          <Paper
            p="md"
            style={{
              background: '#fed7d7', // Solid color instead of gradient
              borderRadius: '12px',
              border: '1px solid #f56565',
            }}
          >
            <Group gap="xs">
              <IconTrophy size={20} color="#c53030" />
              <Text size="sm" c="#c53030" fw={500}>
                Game completed! Click "Start New Game" when ready.
              </Text>
            </Group>
          </Paper>
        )}
      </Stack>
    </Paper>
  );
}

export default GameControls;
