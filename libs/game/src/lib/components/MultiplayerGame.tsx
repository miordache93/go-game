import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Alert,
  Checkbox,
  Container,
  Title,
  Text,
  Button,
  Badge,
  Group,
  Stack,
  Card,
  TextInput,
  Modal,
  Divider,
  Loader,
} from '@mantine/core';
import { useElementSize, useViewportSize } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { GoBoard } from './GoBoard';
import { GameControls } from './GameControls';
import { ScoringControls } from './ScoringControls';
import { PartyKitClient, fetchAvailableRooms } from '../services/partykit-client';
import { apiClient } from '../services/api-client';
import { useAuthStore } from '../stores/auth-store';
import { GameState, Position, Player, GamePhase } from '@go-game/types';
import { PlayerInfo, PlayerRole, PublicRoomInfo, createRoomId } from '@go-game/partykit-protocol';
import { IconList, IconLogin, IconLock, IconPlus, IconRefresh } from '@tabler/icons-react';
import { ShareRoom } from './ShareRoom';

interface MultiplayerGameProps {
  roomId?: string;
  playerName?: string;
  onBack?: () => void;
}

type ModalMode = 'menu' | 'create' | 'join';

const ROOM_LIST_REFRESH_MS = 15_000;

function formatTimeRemaining(expiresAt?: string): string {
  if (!expiresAt) return '5:00';

  const remainingMs = Math.max(0, Date.parse(expiresAt) - Date.now());
  const minutes = Math.floor(remainingMs / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1000);

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function getInviteLink(roomId: string): string {
  if (typeof window === 'undefined') {
    return roomId;
  }

  const url = new URL(window.location.href);
  url.searchParams.set('room', roomId);
  return url.toString();
}

function parseRoomJoinInput(value: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return '';
  }

  try {
    const baseUrl =
      typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
    return new URL(trimmedValue, baseUrl).searchParams.get('room')?.trim() || trimmedValue;
  } catch {
    return trimmedValue;
  }
}

export function MultiplayerGame({ roomId: initialRoomId, playerName: initialPlayerName, onBack }: MultiplayerGameProps) {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [showModal, setShowModal] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>('menu');
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
  const [currentRoomIsPrivate, setCurrentRoomIsPrivate] = useState(false);
  const [currentRoomWaitingExpiresAt, setCurrentRoomWaitingExpiresAt] = useState<string>();
  const [availableRooms, setAvailableRooms] = useState<PublicRoomInfo[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [roomListError, setRoomListError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const hasAppliedInitialRoom = useRef(false);
  const hasAutoConnected = useRef(false);
  
  // Game state
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [myRole, setMyRole] = useState<PlayerRole>(PlayerRole.SPECTATOR);
  const [client, setClient] = useState<PartyKitClient | null>(null);
  const [deadStones, setDeadStones] = useState<Set<string>>(new Set());

  // Authenticated identity (optional) so completed games map to real accounts
  const authUser = useAuthStore((state) => state.user);

  // Size the board to fit its container width and the viewport height so the
  // fixed-pixel Konva canvas never overflows on small/mobile screens.
  const { ref: boardAreaRef, width: boardAreaW } = useElementSize();
  const { height: viewportH } = useViewportSize();
  const boardPx = boardAreaW
    ? Math.max(
        220,
        Math.min(boardAreaW - 8, (viewportH || 800) * 0.7, 560)
      )
    : 500;

  const inviteLink = useMemo(() => (roomId ? getInviteLink(roomId) : ''), [roomId]);

  const loadAvailableRooms = useCallback(async () => {
    setIsLoadingRooms(true);
    setRoomListError(null);

    try {
      const rooms = await fetchAvailableRooms();
      setAvailableRooms(rooms);
    } catch (error) {
      setRoomListError(
        error instanceof Error ? error.message : 'Unable to load rooms'
      );
    } finally {
      setIsLoadingRooms(false);
    }
  }, []);

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
      setCurrentRoomIsPrivate(false);
      setCurrentRoomWaitingExpiresAt(undefined);
    }
  }, [client]);

  // Connect to PartyKit server
  const connectToGame = useCallback((
    roomToJoin: string,
    name: string,
    options?: { isPrivate?: boolean }
  ) => {
    if (!roomToJoin || !name) return;

    // Disconnect existing connection
    disconnect();

    const partyClient = new PartyKitClient({
      roomId: roomToJoin,
      playerName: name,
      userId: authUser?.id,
      authToken: apiClient.getToken() ?? undefined,
      isPrivate: options?.isPrivate,
      onRoomInfo: (roomInfo) => {
        setCurrentRoomIsPrivate(roomInfo.isPrivate);
        setCurrentRoomWaitingExpiresAt(roomInfo.waitingExpiresAt);
      },
      
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
    setCurrentRoomIsPrivate(!!options?.isPrivate);
    setCurrentRoomWaitingExpiresAt(undefined);
    setShowModal(false);
  }, [disconnect, players, authUser]);

  useEffect(() => {
    if (initialPlayerName) {
      setPlayerName(initialPlayerName);
    }
  }, [initialPlayerName]);

  useEffect(() => {
    if (!initialRoomId || hasAppliedInitialRoom.current) return;

    hasAppliedInitialRoom.current = true;
    setJoinRoomId(initialRoomId);
    setModalMode('join');
    setShowModal(true);

    if (initialPlayerName && !hasAutoConnected.current) {
      hasAutoConnected.current = true;
      connectToGame(initialRoomId, initialPlayerName);
    }
  }, [connectToGame, initialPlayerName, initialRoomId]);

  useEffect(() => {
    if (!showModal || modalMode !== 'menu') return;

    loadAvailableRooms();
    const refreshId = window.setInterval(loadAvailableRooms, ROOM_LIST_REFRESH_MS);

    return () => window.clearInterval(refreshId);
  }, [loadAvailableRooms, modalMode, showModal]);

  useEffect(() => {
    const tickId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tickId);
  }, []);

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
    setIsPrivateRoom(false);
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
    const visibleRooms = availableRooms.filter(
      (room) => Date.parse(room.waitingExpiresAt) > now
    );

    switch (modalMode) {
      case 'menu':
        return (
          <Stack gap="md">
            <Text size="sm" color="dimmed" ta="center">
              Create a room, join by link, or pick a public room that is waiting for an opponent.
            </Text>
            <TextInput
              label="Your Name"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.currentTarget.value)}
              required
            />
            <Button
              fullWidth
              leftSection={<IconPlus size={20} />}
              onClick={() => setModalMode('create')}
              size="lg"
            >
              Create Room
            </Button>
            <Button
              fullWidth
              leftSection={<IconLogin size={20} />}
              onClick={() => setModalMode('join')}
              variant="outline"
              size="lg"
            >
              Enter Room ID
            </Button>
            <Divider label="Available public rooms" labelPosition="center" />
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <IconList size={18} />
                <Text size="sm" fw={600}>Rooms waiting for a player</Text>
              </Group>
              <Button
                size="xs"
                variant="subtle"
                leftSection={<IconRefresh size={14} />}
                loading={isLoadingRooms}
                onClick={loadAvailableRooms}
              >
                Refresh
              </Button>
            </Group>
            {roomListError && (
              <Alert color="red" p="sm">
                <Text size="sm">{roomListError}</Text>
              </Alert>
            )}
            {isLoadingRooms && visibleRooms.length === 0 ? (
              <Group justify="center" py="sm">
                <Loader size="sm" />
              </Group>
            ) : visibleRooms.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center">
                No public rooms are waiting right now.
              </Text>
            ) : (
              <Stack gap="xs">
                {visibleRooms.map((room) => (
                  <Card key={room.id} withBorder p="sm">
                    <Group justify="space-between" align="center" wrap="nowrap">
                      <Stack gap={2} style={{ minWidth: 0 }}>
                        <Text size="sm" fw={600} truncate>
                          {room.playerNames[0] || 'Player'} is waiting
                        </Text>
                        <Text size="xs" c="dimmed" truncate>
                          {room.id}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Expires in {formatTimeRemaining(room.waitingExpiresAt)}
                        </Text>
                      </Stack>
                      <Button
                        size="xs"
                        onClick={() => {
                          if (playerName.trim()) {
                            connectToGame(room.id, playerName.trim());
                          } else {
                            setJoinRoomId(room.id);
                            setModalMode('join');
                          }
                        }}
                      >
                        Join
                      </Button>
                    </Group>
                  </Card>
                ))}
              </Stack>
            )}
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
              onChange={(e) => setPlayerName(e.currentTarget.value)}
              required
              autoFocus
            />
            <Checkbox
              label="Private room"
              description="Private rooms are hidden from the public list and can only be joined with an invite link or room ID."
              checked={isPrivateRoom}
              onChange={(e) => setIsPrivateRoom(e.currentTarget.checked)}
            />
            <Alert
              color={isPrivateRoom ? 'gray' : 'blue'}
              icon={isPrivateRoom ? <IconLock size={16} /> : <IconList size={16} />}
              p="sm"
            >
              <Text size="sm">
                {isPrivateRoom
                  ? 'Only people with the invite link or room ID can join.'
                  : 'Public rooms appear in the room list for 5 minutes while waiting for a second player.'}
              </Text>
            </Alert>
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
                  connectToGame(newRoomId, playerName.trim(), { isPrivate: isPrivateRoom });
                }}
                disabled={!playerName.trim()}
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
              onChange={(e) => setPlayerName(e.currentTarget.value)}
              required
            />
            <TextInput
              label="Room ID"
              placeholder="Enter room ID or invite link"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.currentTarget.value)}
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
                onClick={() => connectToGame(parseRoomJoinInput(joinRoomId), playerName.trim())}
                disabled={!playerName.trim() || !joinRoomId.trim()}
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

      {/* Main game area - wraps to a single column on narrow screens */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'flex-start',
        }}
      >
        {/* Board */}
        <div
          ref={boardAreaRef}
          style={{
            flex: '1 1 320px',
            minWidth: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <GoBoard
            board={gameState.board}
            boardSize={gameState.boardSize}
            currentPlayer={gameState.currentPlayer}
            theme="modern"
            width={boardPx}
            height={boardPx}
            lastMove={gameState.lastMove?.position}
            onIntersectionClick={handleIntersectionClick}
            interactive={true} // Always allow clicks, we'll handle permissions in the click handler
            deadStones={deadStones}
          />
        </div>

        {/* Controls */}
        <Stack gap="md" style={{ flex: '1 1 260px', minWidth: 0, maxWidth: 320 }}>
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
            <Group justify="space-between" mb="xs">
              <Text size="sm" fw={500}>Invite players</Text>
              <Badge color={currentRoomIsPrivate ? 'gray' : 'blue'} variant="light">
                {currentRoomIsPrivate ? 'Private' : 'Public'}
              </Badge>
            </Group>
            {!currentRoomIsPrivate && currentRoomWaitingExpiresAt && players.filter(p => p.role !== PlayerRole.SPECTATOR).length < 2 && (
              <Text size="xs" c="dimmed" mb="xs">
                Public listing expires in {formatTimeRemaining(currentRoomWaitingExpiresAt)}
              </Text>
            )}
            <ShareRoom roomId={roomId} inviteLink={inviteLink} playerName={playerName} />
            <Text size="xs" c="dimmed" mt="xs">
              Anyone with the link can join this room.
            </Text>
          </Card>
        </Stack>
      </div>
    </Container>
  );
}

export default MultiplayerGame;
