import { useState, useEffect, useCallback } from 'react';
import { Container, Title, Text, Button, Badge, Group, Stack, Card, TextInput, Modal } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { GoBoard } from './GoBoard';
import { GameControls } from './GameControls';
import { ScoringControls } from './ScoringControls';
import { PartyKitClient } from '../services/partykit-client';
import { GameState, Position, Player, GamePhase } from '@go-game/types';
import { PlayerInfo, PlayerRole, createRoomId } from '@go-game/partykit-protocol';
import { IconPlus, IconLogin } from '@tabler/icons-react';

interface MultiplayerGameProps {
  roomId?: string;
  playerName?: string;
  onBack?: () => void;
}

type ModalMode = 'menu' | 'create' | 'join';

export function MultiplayerGame({ roomId: initialRoomId, playerName: initialPlayerName, onBack }: MultiplayerGameProps) {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [showModal, setShowModal] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>('menu');
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  
  // Game state
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [myRole, setMyRole] = useState<PlayerRole>(PlayerRole.SPECTATOR);
  const [client, setClient] = useState<PartyKitClient | null>(null);
  const [deadStones, setDeadStones] = useState<Set<string>>(new Set());

  // Disconnect and cleanup
  const disconnect = useCallback(() => {
    if (client) {
      client.disconnect();
      setClient(null);
      setIsConnected(false);
      setGameState(null);
      setPlayers([]);
      setMyRole(PlayerRole.SPECTATOR);
      setDeadStones(new Set());
    }
  }, [client]);

  // Connect to PartyKit server
  const connectToGame = useCallback((roomToJoin: string, name: string) => {
    if (!roomToJoin || !name) return;

    // Disconnect existing connection
    disconnect();

    const partyClient = new PartyKitClient({
      roomId: roomToJoin,
      playerName: name,
      
      onConnect: () => {
        setIsConnected(true);
        notifications.show({
          title: '✅ Connected',
          message: `Connected to room: ${roomToJoin}`,
          color: 'green',
        });
      },
      
      onDisconnect: () => {
        setIsConnected(false);
        notifications.show({
          title: '❌ Disconnected',
          message: 'Lost connection to server',
          color: 'red',
        });
      },
      
      onError: (error, code) => {
        notifications.show({
          title: '❌ Error',
          message: error,
          color: 'red',
        });
      },
      
      onRoleAssigned: (role, playerId) => {
        setMyRole(role);
        const roleText = role === PlayerRole.BLACK_PLAYER ? 'Black' : 
                        role === PlayerRole.WHITE_PLAYER ? 'White' : 'Spectator';
        notifications.show({
          title: '🎭 Role Assigned',
          message: `You are playing as ${roleText}`,
          color: 'blue',
        });
      },
      
      onGameStateUpdate: (state, playerList) => {
        setGameState(state);
        setPlayers(playerList);
      },
      
      onMoveMade: (move, state, capturedStones) => {
        setGameState(state);
        if (capturedStones && capturedStones.length > 0) {
          notifications.show({
            title: '🎯 Stones Captured',
            message: `${capturedStones.length} stones captured`,
            color: 'orange',
          });
        }
      },
      
      onInvalidMove: (reason) => {
        notifications.show({
          title: '❌ Invalid Move',
          message: reason,
          color: 'red',
        });
      },
      
      onPlayerJoined: (player) => {
        setPlayers(prev => [...prev, player]);
        notifications.show({
          title: '👋 Player Joined',
          message: `${player.name} joined the game`,
          color: 'blue',
        });
      },
      
      onPlayerLeft: (playerId) => {
        const player = players.find(p => p.id === playerId);
        if (player) {
          notifications.show({
            title: '👋 Player Left',
            message: `${player.name} left the game`,
            color: 'yellow',
          });
        }
        setPlayers(prev => prev.filter(p => p.id !== playerId));
      },
      
      onGameStarted: (state) => {
        setGameState(state);
        notifications.show({
          title: '🎮 Game Started',
          message: 'The game has begun!',
          color: 'green',
        });
      },
      
      onGameEnded: (winner, reason, finalScore) => {
        const winnerText = winner === Player.BLACK ? 'Black' : winner === Player.WHITE ? 'White' : 'Nobody';
        notifications.show({
          title: '🏆 Game Over',
          message: `${winnerText} wins by ${reason}!`,
          color: 'green',
          autoClose: false,
        });
      },
      
      onScoringStarted: () => {
        notifications.show({
          title: '📊 Scoring Phase',
          message: 'Mark dead stones by clicking on them',
          color: 'yellow',
        });
      },
      
      onDeadStonesMarked: (stones, state) => {
        setDeadStones(new Set(stones));
        setGameState(state);
      },
      
      onGameFinalized: (state, finalScore) => {
        setGameState(state);
        const winner = finalScore.winner === Player.BLACK ? 'Black' : 
                      finalScore.winner === Player.WHITE ? 'White' : 'Nobody';
        notifications.show({
          title: '🏆 Game Finalized',
          message: `${winner} wins by ${Math.abs(finalScore.black.total - finalScore.white.total)} points!`,
          color: 'green',
          autoClose: false,
        });
      },
    });

    partyClient.connect();
    setClient(partyClient);
    setRoomId(roomToJoin);
    setPlayerName(name);
    setShowModal(false);
  }, [disconnect, players]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      client?.disconnect();
    };
  }, [client]);

  // Handle board clicks
  const handleIntersectionClick = useCallback((position: Position) => {
    if (!client || !gameState) return;

    // Check if game is finished
    if (gameState.phase === GamePhase.FINISHED) {
      notifications.show({
        title: '🏁 Game Over',
        message: 'This game has ended. Create a new room to play again.',
        color: 'yellow',
      });
      return;
    }

    // Check if it's my turn (for players)
    if (myRole === PlayerRole.BLACK_PLAYER || myRole === PlayerRole.WHITE_PLAYER) {
      const myColor = myRole === PlayerRole.BLACK_PLAYER ? Player.BLACK : Player.WHITE;
      if (gameState.phase === GamePhase.PLAYING && gameState.currentPlayer !== myColor) {
        notifications.show({
          title: '⏳ Not Your Turn',
          message: 'Wait for the other player to move',
          color: 'yellow',
        });
        return;
      }
    } else if (gameState.phase === GamePhase.PLAYING) {
      notifications.show({
        title: '👀 Spectator Mode',
        message: 'You are watching the game',
        color: 'blue',
      });
      return;
    }

    // Handle action based on game phase
    if (gameState.phase === GamePhase.SCORING) {
      // In scoring phase, both players can mark dead stones
      if (myRole === PlayerRole.BLACK_PLAYER || myRole === PlayerRole.WHITE_PLAYER) {
        client.markDead(position);
      }
    } else {
      client.makeMove(position);
    }
  }, [client, gameState, myRole]);

  // Handle control actions
  // Can interact check
  const canInteract = (myRole === PlayerRole.BLACK_PLAYER || myRole === PlayerRole.WHITE_PLAYER);

  const handlePass = useCallback(() => {
    if (!canInteract || gameState?.currentPlayer !== (myRole === PlayerRole.BLACK_PLAYER ? Player.BLACK : Player.WHITE)) {
      return;
    }
    client?.pass();
  }, [client, gameState, myRole, canInteract]);

  const handleResign = useCallback(() => {
    if (!canInteract) return;
    client?.resign();
  }, [client, canInteract]);

  const handleFinalizeGame = useCallback(() => {
    if (!canInteract) return;
    client?.finalizeGame();
  }, [client, canInteract]);

  const handleResumePlaying = useCallback(() => {
    if (!canInteract) return;
    client?.resumePlaying();
  }, [client, canInteract]);

  const handleNewGame = useCallback(() => {
    // Disconnect from current room
    disconnect();
    // Show modal to create new room
    setModalMode('create');
    setShowModal(true);
    setRoomId('');
    setJoinRoomId('');
  }, [disconnect]);

  const handleLeaveRoom = useCallback(() => {
    disconnect();
    if (onBack) {
      onBack();
    } else {
      setShowModal(true);
      setModalMode('menu');
    }
  }, [disconnect, onBack]);

  // Modal content based on mode
  const renderModalContent = () => {
    switch (modalMode) {
      case 'menu':
        return (
          <Stack>
            <Text size="sm" color="dimmed" ta="center">
              Choose an option to start playing
            </Text>
            <Button
              fullWidth
              leftSection={<IconPlus size={20} />}
              onClick={() => setModalMode('create')}
              size="lg"
            >
              Create New Room
            </Button>
            <Button
              fullWidth
              leftSection={<IconLogin size={20} />}
              onClick={() => setModalMode('join')}
              variant="outline"
              size="lg"
            >
              Join Existing Room
            </Button>
            {onBack && (
              <Button
                fullWidth
                variant="subtle"
                onClick={onBack}
                mt="md"
              >
                Back to Local Play
              </Button>
            )}
          </Stack>
        );

      case 'create':
        return (
          <Stack>
            <TextInput
              label="Your Name"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName((e.currentTarget as any).value)}
              required
              autoFocus
            />
            <Text size="xs" color="dimmed">
              A room ID will be generated automatically
            </Text>
            <Group grow>
              <Button
                variant="subtle"
                onClick={() => setModalMode('menu')}
              >
                Back
              </Button>
              <Button
                onClick={() => {
                  const newRoomId = createRoomId();
                  connectToGame(newRoomId, playerName);
                }}
                disabled={!playerName}
              >
                Create Room
              </Button>
            </Group>
          </Stack>
        );

      case 'join':
        return (
          <Stack>
            <TextInput
              label="Your Name"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName((e.currentTarget as any).value)}
              required
            />
            <TextInput
              label="Room ID"
              placeholder="Enter room ID to join"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId((e.currentTarget as any).value)}
              required
            />
            <Group grow>
              <Button
                variant="subtle"
                onClick={() => setModalMode('menu')}
              >
                Back
              </Button>
              <Button
                onClick={() => connectToGame(joinRoomId, playerName)}
                disabled={!playerName || !joinRoomId}
              >
                Join Room
              </Button>
            </Group>
          </Stack>
        );
    }
  };

  if (showModal) {
    return (
      <Modal
        opened={showModal}
        onClose={() => {
          if (onBack) {
            onBack();
          }
        }}
        withCloseButton={!!onBack}
        centered
        size="sm"
        title={
          modalMode === 'menu' ? 'Multiplayer Go Game' :
          modalMode === 'create' ? 'Create New Room' :
          'Join Room'
        }
      >
        {renderModalContent()}
      </Modal>
    );
  }

  if (!gameState) {
    return (
      <Container size="sm" mt="xl">
        <Card shadow="sm" p="lg">
          <Stack align="center" gap="md">
            <Title order={2}>Connecting to game...</Title>
            <Text color="dimmed">Room ID: {roomId}</Text>
            <Button variant="subtle" onClick={handleLeaveRoom}>
              Cancel
            </Button>
          </Stack>
        </Card>
      </Container>
    );
  }

  // Get current score for display
  const currentScore = gameState.score;

  return (
    <Container size="xl" p="md" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Stack gap="xs" mb="md">
        <Group justify="space-between" align="center">
          <Title order={2}>Go Game - Multiplayer</Title>
          <Group gap="xs">
            <Badge color={isConnected ? 'green' : 'red'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            <Badge color="blue">Room: {roomId}</Badge>
            <Badge color={
              myRole === PlayerRole.BLACK_PLAYER ? 'dark' : 
              myRole === PlayerRole.WHITE_PLAYER ? 'gray' : 'blue'
            }>
              {myRole === PlayerRole.BLACK_PLAYER ? 'Playing Black' : 
               myRole === PlayerRole.WHITE_PLAYER ? 'Playing White' : 'Spectating'}
            </Badge>
            <Button
              size="xs"
              variant="subtle"
              color="red"
              onClick={handleLeaveRoom}
            >
              Leave Room
            </Button>
          </Group>
        </Group>

        {/* Players info */}
        <Group gap="xs">
          <Text size="sm">Players:</Text>
          {players.map(player => (
            <Badge 
              key={player.id} 
              variant={player.isConnected ? 'filled' : 'outline'}
              color={
                player.role === PlayerRole.BLACK_PLAYER ? 'dark' : 
                player.role === PlayerRole.WHITE_PLAYER ? 'gray' : 'blue'
              }
            >
              {player.name} ({player.role.replace('_player', '').replace('_', ' ')})
            </Badge>
          ))}
        </Group>

        {/* Game status warnings */}
        {gameState.phase === GamePhase.PLAYING && players.filter(p => p.role !== PlayerRole.SPECTATOR).length < 2 && (
          <Text size="sm" color="yellow" ta="center">
            ⏳ Waiting for another player to join...
          </Text>
        )}
      </Stack>

      {/* Main game area */}
      <Group grow align="start" style={{ flex: 1 }}>
        {/* Board */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <GoBoard
            board={gameState.board}
            boardSize={gameState.boardSize}
            currentPlayer={gameState.currentPlayer}
            theme="modern"
            width={500}
            height={500}
            lastMove={gameState.lastMove?.position}
            onIntersectionClick={handleIntersectionClick}
            interactive={true} // Always allow clicks, we'll handle permissions in the click handler
            deadStones={deadStones}
          />
        </div>

        {/* Controls */}
        <Stack gap="md" style={{ maxWidth: 300 }}>
          {gameState.phase === GamePhase.SCORING ? (
            <ScoringControls
              score={currentScore}
              onFinalize={handleFinalizeGame}
              onResume={handleResumePlaying}
              disabled={!canInteract}
            />
          ) : (
            <GameControls
              currentPlayer={gameState.currentPlayer}
              gamePhase={gameState.phase}
              capturedStones={{ black: gameState.capturedStones.black.length, white: gameState.capturedStones.white.length }}
              onPass={handlePass}
              onResign={handleResign}
              onNewGame={handleNewGame}
              disabled={!canInteract || (gameState.phase === GamePhase.PLAYING && 
                gameState.currentPlayer !== (myRole === PlayerRole.BLACK_PLAYER ? Player.BLACK : Player.WHITE))}
            />
          )}

          {/* Current turn indicator */}
          {gameState.phase === GamePhase.PLAYING && (
            <Card shadow="xs" p="md">
              <Text size="sm" fw={500}>
                Current Turn: {gameState.currentPlayer === Player.BLACK ? 'Black' : 'White'}
              </Text>
              {canInteract && (
                <Text size="xs" color="dimmed" mt="xs">
                  {gameState.currentPlayer === Player.BLACK && myRole === PlayerRole.BLACK_PLAYER ? 'Your turn!' :
                   gameState.currentPlayer === Player.WHITE && myRole === PlayerRole.WHITE_PLAYER ? 'Your turn!' :
                   'Waiting for opponent...'}
                </Text>
              )}
            </Card>
          )}

          {/* Room info for sharing */}
          <Card shadow="xs" p="sm">
            <Text size="sm" fw={500} mb="xs">Room ID:</Text>
            <Text size="xs" c="dimmed" style={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
              {roomId}
            </Text>
            <Button
              size="sm"
              variant="filled"
              mt="sm"
              fullWidth
              onClick={() => {
                try {
                  // @ts-ignore - clipboard API may not be available
                  navigator?.clipboard?.writeText(roomId);
                  notifications.show({
                    title: '✅ Copied!',
                    message: 'Room ID copied - share it with your friend',
                    color: 'green',
                  });
                } catch (e) {
                  notifications.show({
                    title: 'Room ID',
                    message: roomId,
                    color: 'blue',
                    autoClose: false,
                  });
                }
              }}
            >
              Copy Room ID
            </Button>
            <Text size="xs" c="dimmed" mt="xs">
              Share this ID with others to join
            </Text>
          </Card>
        </Stack>
      </Group>
    </Container>
  );
}

export default MultiplayerGame;