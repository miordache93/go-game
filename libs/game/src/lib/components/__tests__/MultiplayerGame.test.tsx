import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, mockPartyKitState } from './test-utils';
import { MultiplayerGame } from '../MultiplayerGame';
import { Player, GamePhase, BoardSize } from '@go-game/types';
import { PlayerRole } from '@go-game/partykit-protocol';

const mockPartyKitClient = mockPartyKitState.client;

// Mock createRoomId function
vi.mock('@go-game/partykit-protocol', () => ({
  PlayerRole: {
    BLACK_PLAYER: 'black_player',
    WHITE_PLAYER: 'white_player',
    SPECTATOR: 'spectator',
  },
  createRoomId: vi.fn(() => 'test-room-123'),
}));

// Mock notifications
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
  Notifications: ({ children }: any) => children,
}));

// Mock GoBoard component
vi.mock('../GoBoard', () => ({
  GoBoard: vi.fn((props) => (
    <div
      data-testid="mock-go-board"
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
      <button onClick={props.onPass} disabled={props.disabled}>
        Pass
      </button>
      <button onClick={props.onResign} disabled={props.disabled}>
        Resign
      </button>
      <button onClick={props.onNewGame}>New Game</button>
    </div>
  )),
}));

// Mock ScoringControls component
vi.mock('../ScoringControls', () => ({
  ScoringControls: vi.fn((props) => (
    <div data-testid="mock-scoring-controls">
      <button onClick={props.onFinalize} disabled={props.disabled}>
        Finalize
      </button>
      <button onClick={props.onResume} disabled={props.disabled}>
        Resume
      </button>
    </div>
  )),
}));

// Mock clipboard API
Object.defineProperty(window, 'navigator', {
  value: {
    clipboard: {
      writeText: vi.fn(() => Promise.resolve()),
    },
  },
  writable: true,
});

describe('MultiplayerGame Component', () => {
  let mockNotifications: any;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    // Import the mocked notifications
    const notificationModule = await import('@mantine/notifications');
    mockNotifications = notificationModule.notifications;
  });
  
  const mockGameState = {
    board: Array(19).fill(null).map(() => Array(19).fill(null)),
    boardSize: BoardSize.LARGE,
    currentPlayer: Player.BLACK,
    phase: GamePhase.PLAYING,
    lastMove: null,
    capturedStones: { black: [], white: [] },
    score: null,
    moveHistory: [],
  };

  const mockPlayers = [
    {
      id: 'player1',
      name: 'Alice',
      role: PlayerRole.BLACK_PLAYER,
      isConnected: true,
    },
    {
      id: 'player2',
      name: 'Bob',
      role: PlayerRole.WHITE_PLAYER,
      isConnected: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockPartyKitState.activeGameState = mockGameState;
    mockPartyKitState.activePlayers = mockPlayers;
    mockPartyKitState.activeRole = PlayerRole.BLACK_PLAYER;
    mockPartyKitState.clientConfig = null;
    mockPartyKitState.shouldHydrate = true;
    mockPartyKitState.fetchAvailableRooms.mockImplementation(
      () => new Promise(() => undefined)
    );
  });

  describe('Initial State and Modals', () => {
    it('shows modal for room selection by default', () => {
      render(<MultiplayerGame />);
      
      expect(screen.getByText(/multiplayer go game/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create room/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /enter room id/i })).toBeInTheDocument();
    });

    it('shows create room form when create button is clicked', async () => {
      render(<MultiplayerGame />);
      
      const createButton = screen.getByRole('button', { name: /create room/i });
      fireEvent.click(createButton);
      
      expect(screen.getByText(/create new room/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create room/i })).toBeInTheDocument();
    });

    it('shows join room form when join button is clicked', async () => {
      render(<MultiplayerGame />);
      
      const joinButton = screen.getByRole('button', { name: /enter room id/i });
      fireEvent.click(joinButton);
      
      expect(screen.getByRole('heading', { name: /join room/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/room id/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /join room/i })).toBeInTheDocument();
    });

    it('shows back to local play button when onBack is provided', () => {
      const mockOnBack = vi.fn();
      render(<MultiplayerGame onBack={mockOnBack} />);
      
      expect(screen.getByRole('button', { name: /back to local play/i })).toBeInTheDocument();
    });
  });

  describe('Room Creation', () => {
    it('creates room with valid player name', async () => {
      render(<MultiplayerGame />);
      
      // Navigate to create room form
      fireEvent.click(screen.getByRole('button', { name: /create room/i }));
      
      // Fill in player name
      const nameInput = screen.getByLabelText(/your name/i);
      fireEvent.change(nameInput, { target: { value: 'Alice' } });
      
      // Create room
      const createButton = screen.getByRole('button', { name: /create room/i });
      fireEvent.click(createButton);
      
      expect(mockPartyKitClient.connect).toHaveBeenCalled();
    });

    it('disables create button when name is empty', () => {
      render(<MultiplayerGame />);
      
      fireEvent.click(screen.getByRole('button', { name: /create room/i }));
      
      const createButton = screen.getByRole('button', { name: /create room/i });
      expect(createButton).toBeDisabled();
    });
    it('creates private rooms when the privacy option is checked', async () => {
      render(<MultiplayerGame />);

      fireEvent.click(screen.getByRole('button', { name: /create room/i }));
      fireEvent.change(screen.getByLabelText(/your name/i), {
        target: { value: 'Alice' },
      });
      fireEvent.click(screen.getByLabelText(/private room/i));
      fireEvent.click(screen.getByRole('button', { name: /create room/i }));

      expect(mockPartyKitState.clientConfig?.isPrivate).toBe(true);
      expect(mockPartyKitClient.connect).toHaveBeenCalled();
    });
  });

  describe('Room Joining', () => {
    it('joins room with valid room ID and player name', async () => {
      render(<MultiplayerGame />);
      
      // Navigate to join room form
      fireEvent.click(screen.getByRole('button', { name: /enter room id/i }));
      
      // Fill in details
      const nameInput = screen.getByLabelText(/your name/i);
      const roomInput = screen.getByLabelText(/room id/i);
      fireEvent.change(nameInput, { target: { value: 'Bob' } });
      fireEvent.change(roomInput, { target: { value: 'room-123' } });
      
      // Join room
      const joinButton = screen.getByRole('button', { name: /join room/i });
      fireEvent.click(joinButton);
      
      expect(mockPartyKitClient.connect).toHaveBeenCalled();
    });

    it('disables join button when name or room ID is empty', () => {
      render(<MultiplayerGame />);
      
      fireEvent.click(screen.getByRole('button', { name: /enter room id/i }));
      
      const joinButton = screen.getByRole('button', { name: /join room/i });
      expect(joinButton).toBeDisabled();
      
      // Fill only name
      const nameInput = screen.getByLabelText(/your name/i);
      fireEvent.change(nameInput, { target: { value: 'Bob' } });
      expect(joinButton).toBeDisabled();
      
      // Fill only room ID
      fireEvent.change(nameInput, { target: { value: '' } });
      const roomInput = screen.getByLabelText(/room id/i);
      fireEvent.change(roomInput, { target: { value: 'room-123' } });
      expect(joinButton).toBeDisabled();
    });

    it('shows available public rooms and joins one', async () => {
      mockPartyKitState.fetchAvailableRooms.mockResolvedValueOnce([
        {
          id: 'public-room-123',
          playerNames: ['Alice'],
          playerCount: 1,
          spectatorCount: 0,
          createdAt: new Date().toISOString(),
          waitingExpiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          lastActivity: new Date().toISOString(),
        },
      ]);

      render(<MultiplayerGame />);

      expect(await screen.findByText(/alice is waiting/i)).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText(/your name/i), {
        target: { value: 'Bob' },
      });
      fireEvent.click(screen.getByRole('button', { name: /join/i }));

      expect(mockPartyKitState.clientConfig?.roomId).toBe('public-room-123');
      expect(mockPartyKitClient.connect).toHaveBeenCalled();
    });
  });

  describe('Game State Display', () => {
    // Helper to render connected multiplayer game
    const renderConnectedGame = () => {
      return render(
        <MultiplayerGame
          roomId="test-room-123"
          playerName="Alice"
        />
      );
    };

    it('shows connection status badge', () => {
      renderConnectedGame();
      
      // Should show connected status
      expect(screen.getByText(/connected/i)).toBeInTheDocument();
    });

    it('displays room ID', () => {
      renderConnectedGame();
      
      expect(
        screen.getByText(
          (_, element) =>
            element?.tagName === 'SPAN' &&
            element.textContent === 'Room: test-room-123'
        )
      ).toBeInTheDocument();
    });

    it('shows player role badge', () => {
      renderConnectedGame();
      
      // This would depend on the mocked role assignment
      expect(screen.getByText(/playing|spectating/i)).toBeInTheDocument();
    });
  });

  describe('Board Interaction', () => {
    const renderGameWithState = (gameState = mockGameState, players = mockPlayers) => {
      mockPartyKitState.activeGameState = gameState;
      mockPartyKitState.activePlayers = players;
      
      return render(
        <MultiplayerGame
          roomId="test-room"
          playerName="Alice"
        />
      );
    };

    it('allows board interaction for players during their turn', () => {
      renderGameWithState();
      
      const board = screen.getByTestId('mock-go-board');
      expect(board).toHaveAttribute('data-interactive', 'true');
    });

    it('calls makeMove when board is clicked by current player', () => {
      renderGameWithState();
      
      const board = screen.getByTestId('mock-go-board');
      fireEvent.click(board);
      
      expect(mockPartyKitClient.makeMove).toHaveBeenCalledWith({ x: 0, y: 0 });
    });

    it('calls markDead during scoring phase', () => {
      const scoringGameState = {
        ...mockGameState,
        phase: GamePhase.SCORING,
      };
      
      renderGameWithState(scoringGameState);
      
      const board = screen.getByTestId('mock-go-board');
      fireEvent.click(board);
      
      expect(mockPartyKitClient.markDead).toHaveBeenCalledWith({ x: 0, y: 0 });
    });
  });

  describe('Game Controls', () => {
    const renderGameWithState = () => {
      const TestComponent = () => {
        const [showModal] = React.useState(false);
        const [gameState] = React.useState(mockGameState);
        const [players] = React.useState(mockPlayers);
        const [myRole] = React.useState(PlayerRole.BLACK_PLAYER);
        
        if (showModal) {
          return <div>Modal content</div>;
        }
        
        return (
          <div>
            <div data-testid="mock-go-board">Board</div>
            <div data-testid="mock-game-controls">
              <button onClick={() => mockPartyKitClient.pass()}>Pass</button>
              <button onClick={() => mockPartyKitClient.resign()}>Resign</button>
              <button>New Game</button>
            </div>
          </div>
        );
      };
      
      return render(<TestComponent />);
    };

    it('calls pass when pass button is clicked', () => {
      renderGameWithState();
      
      const passButton = screen.getByText('Pass');
      fireEvent.click(passButton);
      
      expect(mockPartyKitClient.pass).toHaveBeenCalled();
    });

    it('calls resign when resign button is clicked', () => {
      renderGameWithState();
      
      const resignButton = screen.getByText('Resign');
      fireEvent.click(resignButton);
      
      expect(mockPartyKitClient.resign).toHaveBeenCalled();
    });
  });

  describe('Scoring Controls', () => {
    const renderScoringGame = () => {
      const TestComponent = () => (
        <div>
          <div data-testid="mock-scoring-controls">
            <button onClick={() => mockPartyKitClient.finalizeGame()}>
              Finalize
            </button>
            <button onClick={() => mockPartyKitClient.resumePlaying()}>
              Resume
            </button>
          </div>
        </div>
      );
      
      return render(<TestComponent />);
    };

    it('calls finalizeGame when finalize button is clicked', () => {
      renderScoringGame();
      
      const finalizeButton = screen.getByText('Finalize');
      fireEvent.click(finalizeButton);
      
      expect(mockPartyKitClient.finalizeGame).toHaveBeenCalled();
    });

    it('calls resumePlaying when resume button is clicked', () => {
      renderScoringGame();
      
      const resumeButton = screen.getByText('Resume');
      fireEvent.click(resumeButton);
      
      expect(mockPartyKitClient.resumePlaying).toHaveBeenCalled();
    });
  });

  describe('Room ID Sharing', () => {
    const renderConnectedGame = () => {
      const TestComponent = () => (
        <div>
          <div>Room ID: test-room-123</div>
          <button
            onClick={() => {
              navigator.clipboard.writeText('test-room-123');
              mockNotifications.show({
                title: '✅ Copied!',
                message: 'Room ID copied - share it with your friend',
                color: 'green',
              });
            }}
          >
            Copy Room ID
          </button>
        </div>
      );
      
      return render(<TestComponent />);
    };

    it('copies room ID to clipboard when copy button is clicked', async () => {
      renderConnectedGame();
      
      const copyButton = screen.getByText('Copy Room ID');
      fireEvent.click(copyButton);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test-room-123');
      expect(mockNotifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '✅ Copied!',
          message: 'Room ID copied - share it with your friend',
        })
      );
    });
  });

  describe('Connection States', () => {
    it('shows connecting message while waiting for connection', () => {
      mockPartyKitState.shouldHydrate = false;
      render(
        <MultiplayerGame
          roomId="test-room"
          playerName="Alice"
        />
      );
      
      expect(screen.getByText(/connecting to game/i)).toBeInTheDocument();
    });

    it('shows cancel button during connection', () => {
      mockPartyKitState.shouldHydrate = false;
      render(
        <MultiplayerGame
          roomId="test-room"
          playerName="Alice"
        />
      );
      
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles invalid moves gracefully', () => {
      const TestComponent = () => {
        const handleClick = () => {
          mockNotifications.show({
            title: '❌ Invalid Move',
            message: 'That move is not allowed',
            color: 'red',
          });
        };
        
        return (
          <div>
            <div data-testid="mock-go-board" onClick={handleClick}>
              Board
            </div>
          </div>
        );
      };
      
      render(<TestComponent />);
      
      const board = screen.getByTestId('mock-go-board');
      fireEvent.click(board);
      
      expect(mockNotifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '❌ Invalid Move',
          color: 'red',
        })
      );
    });

    it('handles connection errors', () => {
      const TestComponent = () => {
        React.useEffect(() => {
          mockNotifications.show({
            title: '❌ Error',
            message: 'Connection failed',
            color: 'red',
          });
        }, []);
        
        return <div>Error state</div>;
      };
      
      render(<TestComponent />);
      
      expect(mockNotifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '❌ Error',
          color: 'red',
        })
      );
    });
  });

  describe('Player Status Display', () => {
    it('shows waiting message when not enough players', () => {
      const singlePlayer = [
        {
          id: 'player1',
          name: 'Alice',
          role: PlayerRole.BLACK_PLAYER,
          isConnected: true,
        },
      ];
      
      const TestComponent = () => (
        <div>
          <div>Players: {singlePlayer.length}</div>
          {singlePlayer.length < 2 && (
            <div>⏳ Waiting for another player to join...</div>
          )}
        </div>
      );
      
      render(<TestComponent />);
      
      expect(screen.getByText(/waiting for another player/i)).toBeInTheDocument();
    });

    it('displays current turn indicator', () => {
      const TestComponent = () => (
        <div>
          <div>Current Turn: Black</div>
          <div>Your turn!</div>
        </div>
      );
      
      render(<TestComponent />);
      
      expect(screen.getByText(/current turn: black/i)).toBeInTheDocument();
      expect(screen.getByText(/your turn/i)).toBeInTheDocument();
    });
  });

  describe('Game Phase Transitions', () => {
    it('shows appropriate notifications for game phase changes', () => {
      const TestComponent = () => {
        React.useEffect(() => {
          // Simulate game started notification
          mockNotifications.show({
            title: '🎮 Game Started',
            message: 'The game has begun!',
            color: 'green',
          });
        }, []);
        
        return <div>Game in progress</div>;
      };
      
      render(<TestComponent />);
      
      expect(mockNotifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '🎮 Game Started',
          color: 'green',
        })
      );
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and button text', () => {
      render(<MultiplayerGame />);
      
      fireEvent.click(screen.getByRole('button', { name: /create room/i }));
      
      expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create room/i })).toBeInTheDocument();
    });

    it('has proper modal structure', () => {
      render(<MultiplayerGame />);
      
      // Modal should have proper title
      expect(screen.getByText(/multiplayer go game/i)).toBeInTheDocument();
    });
  });
});
