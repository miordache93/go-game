import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import GoGameServer from './main';
import { MockParty, MockConnection } from './test-setup';
import {
  ClientMessageType,
  ServerMessageType,
  PlayerRole,
  ErrorCode,
  type ClientToServerMessage,
  type ServerToClientMessage,
} from '@go-game/partykit-protocol';
import { Player, GamePhase, MoveType, BoardSize } from '@go-game/types';

// Mock fetch for backend calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Default mock implementation
mockFetch.mockResolvedValue({
  ok: true,
  text: () => Promise.resolve('OK'),
});

describe('GoGameServer', () => {
  let server: GoGameServer;
  let mockRoom: MockParty;
  let mockConnection1: MockConnection;
  let mockConnection2: MockConnection;
  let mockConnection3: MockConnection;
  let sentMessages: Map<string, ServerToClientMessage[]>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset fetch mock to default implementation
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('OK'),
    });
    
    mockRoom = new MockParty('test-room');
    server = new GoGameServer(mockRoom);
    
    mockConnection1 = new MockConnection('player1');
    mockConnection2 = new MockConnection('player2');
    mockConnection3 = new MockConnection('spectator1');
    
    // Track sent messages for testing
    sentMessages = new Map();
    
    const originalSend1 = mockConnection1.send;
    const originalSend2 = mockConnection2.send;
    const originalSend3 = mockConnection3.send;
    
    mockConnection1.send = vi.fn((message: string) => {
      if (!sentMessages.has('player1')) sentMessages.set('player1', []);
      sentMessages.get('player1')!.push(JSON.parse(message));
      return originalSend1.call(mockConnection1, message);
    });
    
    mockConnection2.send = vi.fn((message: string) => {
      if (!sentMessages.has('player2')) sentMessages.set('player2', []);
      sentMessages.get('player2')!.push(JSON.parse(message));
      return originalSend2.call(mockConnection2, message);
    });
    
    mockConnection3.send = vi.fn((message: string) => {
      if (!sentMessages.has('spectator1')) sentMessages.set('spectator1', []);
      sentMessages.get('spectator1')!.push(JSON.parse(message));
      return originalSend3.call(mockConnection3, message);
    });
  });

  afterEach(() => {
    sentMessages.clear();
  });

  describe('Room Creation and Management', () => {
    it('should initialize room with correct default state', () => {
      expect(server).toBeDefined();
      expect(mockRoom.id).toBe('test-room');
    });

    it('should handle room creation with different IDs', () => {
      const room2 = new MockParty('room-123');
      const server2 = new GoGameServer(room2);
      expect(server2).toBeDefined();
    });
  });

  describe('Connection Management', () => {
    it('should handle new connection and send room info', async () => {
      await server.onConnect(mockConnection1, {} as any);
      
      expect(mockConnection1.send).toHaveBeenCalled();
      const messages = sentMessages.get('player1') || [];
      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe(ServerMessageType.ROOM_INFO);
      expect(messages[0]).toMatchObject({
        type: ServerMessageType.ROOM_INFO,
        roomId: 'test-room',
        spectatorCount: 0,
      });
    });

    it('should handle multiple connections', async () => {
      await server.onConnect(mockConnection1, {} as any);
      await server.onConnect(mockConnection2, {} as any);
      
      expect(mockConnection1.send).toHaveBeenCalled();
      expect(mockConnection2.send).toHaveBeenCalled();
    });

    it('should clean up connections on close', async () => {
      await server.onConnect(mockConnection1, {} as any);
      
      // Join as player
      const joinMessage: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: {
          id: 'player1',
          name: 'Test Player 1',
        },
      };
      
      await server.onMessage(JSON.stringify(joinMessage), mockConnection1);
      await server.onClose(mockConnection1);
      
      // Should not crash when trying to send to closed connection
      const joinMessage2: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: {
          id: 'player2',
          name: 'Test Player 2',
        },
      };
      
      await expect(server.onMessage(JSON.stringify(joinMessage2), mockConnection2)).resolves.not.toThrow();
    });
  });

  describe('Player Joining and Role Assignment', () => {
    it('should assign black player role to first player', async () => {
      await server.onConnect(mockConnection1, {} as any);
      
      const joinMessage: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: {
          id: 'player1',
          name: 'Black Player',
        },
      };
      
      await server.onMessage(JSON.stringify(joinMessage), mockConnection1);
      
      const messages = sentMessages.get('player1') || [];
      const roleAssigned = messages.find(m => m.type === ServerMessageType.ROLE_ASSIGNED);
      expect(roleAssigned).toBeDefined();
      expect(roleAssigned).toMatchObject({
        type: ServerMessageType.ROLE_ASSIGNED,
        role: PlayerRole.BLACK_PLAYER,
        playerId: 'player1',
      });
    });

    it('should assign white player role to second player', async () => {
      await server.onConnect(mockConnection1, {} as any);
      await server.onConnect(mockConnection2, {} as any);
      
      // First player joins
      const joinMessage1: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: {
          id: 'player1',
          name: 'Black Player',
        },
      };
      await server.onMessage(JSON.stringify(joinMessage1), mockConnection1);
      
      // Second player joins
      const joinMessage2: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: {
          id: 'player2',
          name: 'White Player',
        },
      };
      await server.onMessage(JSON.stringify(joinMessage2), mockConnection2);
      
      const messages = sentMessages.get('player2') || [];
      const roleAssigned = messages.find(m => m.type === ServerMessageType.ROLE_ASSIGNED);
      expect(roleAssigned).toBeDefined();
      expect(roleAssigned).toMatchObject({
        type: ServerMessageType.ROLE_ASSIGNED,
        role: PlayerRole.WHITE_PLAYER,
        playerId: 'player2',
      });
    });

    it('should assign spectator role to third player', async () => {
      await server.onConnect(mockConnection1, {} as any);
      await server.onConnect(mockConnection2, {} as any);
      await server.onConnect(mockConnection3, {} as any);
      
      // Join two players first
      const joinMessage1: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'player1', name: 'Black Player' },
      };
      await server.onMessage(JSON.stringify(joinMessage1), mockConnection1);
      
      const joinMessage2: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'player2', name: 'White Player' },
      };
      await server.onMessage(JSON.stringify(joinMessage2), mockConnection2);
      
      // Third player should be spectator
      const joinMessage3: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'spectator1', name: 'Spectator' },
      };
      await server.onMessage(JSON.stringify(joinMessage3), mockConnection3);
      
      const messages = sentMessages.get('spectator1') || [];
      const roleAssigned = messages.find(m => m.type === ServerMessageType.ROLE_ASSIGNED);
      expect(roleAssigned).toBeDefined();
      expect(roleAssigned).toMatchObject({
        type: ServerMessageType.ROLE_ASSIGNED,
        role: PlayerRole.SPECTATOR,
        playerId: 'spectator1',
      });
    });

    it('should allow requesting specific role if available', async () => {
      await server.onConnect(mockConnection1, {} as any);
      
      const joinMessage: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'player1', name: 'White Player' },
        requestedRole: PlayerRole.WHITE_PLAYER,
      };
      
      await server.onMessage(JSON.stringify(joinMessage), mockConnection1);
      
      const messages = sentMessages.get('player1') || [];
      const roleAssigned = messages.find(m => m.type === ServerMessageType.ROLE_ASSIGNED);
      expect(roleAssigned).toMatchObject({
        role: PlayerRole.WHITE_PLAYER,
      });
    });

    it('should assign spectator if requested role is taken', async () => {
      await server.onConnect(mockConnection1, {} as any);
      await server.onConnect(mockConnection2, {} as any);
      
      // First player takes black
      const joinMessage1: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'player1', name: 'Player 1' },
        requestedRole: PlayerRole.BLACK_PLAYER,
      };
      await server.onMessage(JSON.stringify(joinMessage1), mockConnection1);
      
      // Second player also requests black but should get spectator (since role is taken)
      const joinMessage2: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'player2', name: 'Player 2' },
        requestedRole: PlayerRole.BLACK_PLAYER,
      };
      await server.onMessage(JSON.stringify(joinMessage2), mockConnection2);
      
      const messages = sentMessages.get('player2') || [];
      const roleAssigned = messages.find(m => m.type === ServerMessageType.ROLE_ASSIGNED);
      expect(roleAssigned).toMatchObject({
        role: PlayerRole.SPECTATOR,
      });
    });

    it('should broadcast player joined message to others', async () => {
      await server.onConnect(mockConnection1, {} as any);
      await server.onConnect(mockConnection2, {} as any);
      
      const joinMessage1: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'player1', name: 'Player 1' },
      };
      await server.onMessage(JSON.stringify(joinMessage1), mockConnection1);
      
      // Clear messages before second join
      sentMessages.clear();
      
      const joinMessage2: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'player2', name: 'Player 2' },
      };
      await server.onMessage(JSON.stringify(joinMessage2), mockConnection2);
      
      // Player 1 should receive player joined message
      const messages1 = sentMessages.get('player1') || [];
      const playerJoined = messages1.find(m => m.type === ServerMessageType.PLAYER_JOINED);
      expect(playerJoined).toBeDefined();
      expect(playerJoined).toMatchObject({
        type: ServerMessageType.PLAYER_JOINED,
        player: {
          id: 'player2',
          name: 'Player 2',
          role: PlayerRole.WHITE_PLAYER,
          isConnected: true,
        },
      });
    });
  });

  describe('Game State Synchronization', () => {
    beforeEach(async () => {
      // Set up two players
      await server.onConnect(mockConnection1, {} as any);
      await server.onConnect(mockConnection2, {} as any);
      
      const joinMessage1: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'player1', name: 'Black Player' },
      };
      await server.onMessage(JSON.stringify(joinMessage1), mockConnection1);
      
      const joinMessage2: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'player2', name: 'White Player' },
      };
      await server.onMessage(JSON.stringify(joinMessage2), mockConnection2);
      
      sentMessages.clear(); // Clear setup messages
    });

    it('should send game state update when player joins', async () => {
      await server.onConnect(mockConnection3, {} as any);
      
      const joinMessage: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'spectator1', name: 'Spectator' },
      };
      await server.onMessage(JSON.stringify(joinMessage), mockConnection3);
      
      const messages = sentMessages.get('spectator1') || [];
      const gameStateUpdate = messages.find(m => m.type === ServerMessageType.GAME_STATE_UPDATE);
      expect(gameStateUpdate).toBeDefined();
      expect(gameStateUpdate).toMatchObject({
        type: ServerMessageType.GAME_STATE_UPDATE,
        gameState: expect.objectContaining({
          phase: GamePhase.PLAYING,
          currentPlayer: Player.BLACK,
          boardSize: BoardSize.LARGE,
        }),
        players: expect.arrayContaining([
          expect.objectContaining({ name: 'Black Player' }),
          expect.objectContaining({ name: 'White Player' }),
        ]),
      });
    });

    it('should start game when both players join', async () => {
      // Game should already be started from beforeEach setup
      // Let's trigger game start by setting up fresh players
      const server2 = new GoGameServer(new MockParty('test-room-2'));
      const conn1 = new MockConnection('p1');
      const conn2 = new MockConnection('p2');
      const messages1: ServerToClientMessage[] = [];
      const messages2: ServerToClientMessage[] = [];
      
      conn1.send = vi.fn((msg: string) => messages1.push(JSON.parse(msg)));
      conn2.send = vi.fn((msg: string) => messages2.push(JSON.parse(msg)));
      
      await server2.onConnect(conn1, {} as any);
      await server2.onConnect(conn2, {} as any);
      
      const joinMessage1: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'p1', name: 'Black Player' },
      };
      await server2.onMessage(JSON.stringify(joinMessage1), conn1);
      
      const joinMessage2: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'p2', name: 'White Player' },
      };
      await server2.onMessage(JSON.stringify(joinMessage2), conn2);
      
      // Both players should have received game started message
      expect(messages1.some(m => m.type === ServerMessageType.GAME_STARTED)).toBe(true);
      expect(messages2.some(m => m.type === ServerMessageType.GAME_STARTED)).toBe(true);
    });

    it('should synchronize game state after moves', async () => {
      const moveMessage: ClientToServerMessage = {
        type: ClientMessageType.MAKE_MOVE,
        timestamp: Date.now(),
        position: { x: 3, y: 3 },
      };
      
      await server.onMessage(JSON.stringify(moveMessage), mockConnection1);
      
      const messages1 = sentMessages.get('player1') || [];
      const messages2 = sentMessages.get('player2') || [];
      
      const moveMade1 = messages1.find(m => m.type === ServerMessageType.MOVE_MADE);
      const moveMade2 = messages2.find(m => m.type === ServerMessageType.MOVE_MADE);
      
      expect(moveMade1).toBeDefined();
      expect(moveMade2).toBeDefined();
      expect(moveMade1).toMatchObject({
        type: ServerMessageType.MOVE_MADE,
        move: expect.objectContaining({
          player: Player.BLACK,
          type: MoveType.PLACE_STONE,
          position: { x: 3, y: 3 },
        }),
        gameState: expect.objectContaining({
          currentPlayer: Player.WHITE, // Should switch to white
        }),
      });
    });
  });

  describe('Move Making', () => {
    beforeEach(async () => {
      // Set up game with two players
      await server.onConnect(mockConnection1, {} as any);
      await server.onConnect(mockConnection2, {} as any);
      
      const joinMessage1: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'player1', name: 'Black Player' },
      };
      await server.onMessage(JSON.stringify(joinMessage1), mockConnection1);
      
      const joinMessage2: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'player2', name: 'White Player' },
      };
      await server.onMessage(JSON.stringify(joinMessage2), mockConnection2);
      
      sentMessages.clear();
    });

    it('should allow valid moves by current player', async () => {
      const moveMessage: ClientToServerMessage = {
        type: ClientMessageType.MAKE_MOVE,
        timestamp: Date.now(),
        position: { x: 3, y: 3 },
      };
      
      await server.onMessage(JSON.stringify(moveMessage), mockConnection1);
      
      const messages = sentMessages.get('player1') || [];
      expect(messages.some(m => m.type === ServerMessageType.MOVE_MADE)).toBe(true);
      expect(messages.some(m => m.type === ServerMessageType.INVALID_MOVE)).toBe(false);
    });

    it('should reject moves from wrong player', async () => {
      // White player tries to move when it's black's turn
      const moveMessage: ClientToServerMessage = {
        type: ClientMessageType.MAKE_MOVE,
        timestamp: Date.now(),
        position: { x: 3, y: 3 },
      };
      
      await server.onMessage(JSON.stringify(moveMessage), mockConnection2);
      
      const messages = sentMessages.get('player2') || [];
      const errorMessage = messages.find(m => m.type === ServerMessageType.ERROR);
      expect(errorMessage).toBeDefined();
      expect(errorMessage).toMatchObject({
        type: ServerMessageType.ERROR,
        error: 'Not your turn',
        code: ErrorCode.NOT_YOUR_TURN,
      });
    });

    it('should reject invalid moves (occupied position)', async () => {
      // First move
      const moveMessage1: ClientToServerMessage = {
        type: ClientMessageType.MAKE_MOVE,
        timestamp: Date.now(),
        position: { x: 3, y: 3 },
      };
      await server.onMessage(JSON.stringify(moveMessage1), mockConnection1);
      
      sentMessages.clear();
      
      // Try to place stone on same position
      const moveMessage2: ClientToServerMessage = {
        type: ClientMessageType.MAKE_MOVE,
        timestamp: Date.now(),
        position: { x: 3, y: 3 },
      };
      await server.onMessage(JSON.stringify(moveMessage2), mockConnection2);
      
      const messages = sentMessages.get('player2') || [];
      const invalidMove = messages.find(m => m.type === ServerMessageType.INVALID_MOVE);
      expect(invalidMove).toBeDefined();
      expect(invalidMove).toMatchObject({
        type: ServerMessageType.INVALID_MOVE,
        position: { x: 3, y: 3 },
      });
    });

    it('should reject moves outside board bounds', async () => {
      const moveMessage: ClientToServerMessage = {
        type: ClientMessageType.MAKE_MOVE,
        timestamp: Date.now(),
        position: { x: 20, y: 20 }, // Outside 19x19 board
      };
      
      await server.onMessage(JSON.stringify(moveMessage), mockConnection1);
      
      const messages = sentMessages.get('player1') || [];
      const invalidMove = messages.find(m => m.type === ServerMessageType.INVALID_MOVE);
      expect(invalidMove).toBeDefined();
    });

    it('should handle pass moves', async () => {
      const passMessage: ClientToServerMessage = {
        type: ClientMessageType.PASS,
        timestamp: Date.now(),
      };
      
      await server.onMessage(JSON.stringify(passMessage), mockConnection1);
      
      const messages1 = sentMessages.get('player1') || [];
      const messages2 = sentMessages.get('player2') || [];
      
      expect(messages1.some(m => m.type === ServerMessageType.MOVE_MADE)).toBe(true);
      expect(messages2.some(m => m.type === ServerMessageType.MOVE_MADE)).toBe(true);
    });

    it('should handle resign moves', async () => {
      const resignMessage: ClientToServerMessage = {
        type: ClientMessageType.RESIGN,
        timestamp: Date.now(),
      };
      
      await server.onMessage(JSON.stringify(resignMessage), mockConnection1);
      
      const messages1 = sentMessages.get('player1') || [];
      const messages2 = sentMessages.get('player2') || [];
      
      const gameEnded1 = messages1.find(m => m.type === ServerMessageType.GAME_ENDED);
      const gameEnded2 = messages2.find(m => m.type === ServerMessageType.GAME_ENDED);
      
      expect(gameEnded1).toBeDefined();
      expect(gameEnded2).toBeDefined();
      expect(gameEnded1).toMatchObject({
        type: ServerMessageType.GAME_ENDED,
        winner: Player.WHITE, // White wins when black resigns
        reason: 'resignation',
      });
    });

    it('should transition to scoring after two consecutive passes', async () => {
      // Black passes
      const passMessage1: ClientToServerMessage = {
        type: ClientMessageType.PASS,
        timestamp: Date.now(),
      };
      await server.onMessage(JSON.stringify(passMessage1), mockConnection1);
      
      sentMessages.clear();
      
      // White passes
      const passMessage2: ClientToServerMessage = {
        type: ClientMessageType.PASS,
        timestamp: Date.now(),
      };
      await server.onMessage(JSON.stringify(passMessage2), mockConnection2);
      
      const messages1 = sentMessages.get('player1') || [];
      const messages2 = sentMessages.get('player2') || [];
      
      expect(messages1.some(m => m.type === ServerMessageType.SCORING_STARTED)).toBe(true);
      expect(messages2.some(m => m.type === ServerMessageType.SCORING_STARTED)).toBe(true);
    });
  });

  describe('Spectator Handling', () => {
    beforeEach(async () => {
      // Set up game with two players and one spectator
      await server.onConnect(mockConnection1, {} as any);
      await server.onConnect(mockConnection2, {} as any);
      await server.onConnect(mockConnection3, {} as any);
      
      const joinMessage1: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'player1', name: 'Black Player' },
      };
      await server.onMessage(JSON.stringify(joinMessage1), mockConnection1);
      
      const joinMessage2: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'player2', name: 'White Player' },
      };
      await server.onMessage(JSON.stringify(joinMessage2), mockConnection2);
      
      const joinMessage3: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'spectator1', name: 'Spectator' },
      };
      await server.onMessage(JSON.stringify(joinMessage3), mockConnection3);
      
      sentMessages.clear();
    });

    it('should prevent spectators from making moves', async () => {
      const moveMessage: ClientToServerMessage = {
        type: ClientMessageType.MAKE_MOVE,
        timestamp: Date.now(),
        position: { x: 3, y: 3 },
      };
      
      await server.onMessage(JSON.stringify(moveMessage), mockConnection3);
      
      const messages = sentMessages.get('spectator1') || [];
      const errorMessage = messages.find(m => m.type === ServerMessageType.ERROR);
      expect(errorMessage).toBeDefined();
      expect(errorMessage).toMatchObject({
        type: ServerMessageType.ERROR,
        error: 'Not your turn',
        code: ErrorCode.NOT_YOUR_TURN,
      });
    });

    it('should allow spectators to receive game updates', async () => {
      const moveMessage: ClientToServerMessage = {
        type: ClientMessageType.MAKE_MOVE,
        timestamp: Date.now(),
        position: { x: 3, y: 3 },
      };
      
      await server.onMessage(JSON.stringify(moveMessage), mockConnection1);
      
      const messages = sentMessages.get('spectator1') || [];
      expect(messages.some(m => m.type === ServerMessageType.MOVE_MADE)).toBe(true);
    });

    it('should allow spectators to chat', async () => {
      const chatMessage: ClientToServerMessage = {
        type: ClientMessageType.CHAT_MESSAGE,
        timestamp: Date.now(),
        message: 'Great game!',
      };
      
      await server.onMessage(JSON.stringify(chatMessage), mockConnection3);
      
      const messages1 = sentMessages.get('player1') || [];
      const messages2 = sentMessages.get('player2') || [];
      const messages3 = sentMessages.get('spectator1') || [];
      
      const chatBroadcast1 = messages1.find(m => m.type === ServerMessageType.CHAT_BROADCAST);
      const chatBroadcast2 = messages2.find(m => m.type === ServerMessageType.CHAT_BROADCAST);
      const chatBroadcast3 = messages3.find(m => m.type === ServerMessageType.CHAT_BROADCAST);
      
      expect(chatBroadcast1).toMatchObject({
        type: ServerMessageType.CHAT_BROADCAST,
        playerId: 'spectator1',
        playerName: 'Spectator',
        message: 'Great game!',
      });
      
      expect(chatBroadcast2).toMatchObject({
        type: ServerMessageType.CHAT_BROADCAST,
        message: 'Great game!',
      });
      
      expect(chatBroadcast3).toMatchObject({
        type: ServerMessageType.CHAT_BROADCAST,
        message: 'Great game!',
      });
    });

    it('should remove spectator from spectators set on disconnect', async () => {
      // Spectator disconnects
      await server.onClose(mockConnection3);
      
      // Should not crash when broadcasting subsequent messages
      const moveMessage: ClientToServerMessage = {
        type: ClientMessageType.MAKE_MOVE,
        timestamp: Date.now(),
        position: { x: 3, y: 3 },
      };
      
      await expect(server.onMessage(JSON.stringify(moveMessage), mockConnection1)).resolves.not.toThrow();
    });
  });

  describe('Message Broadcasting', () => {
    beforeEach(async () => {
      await server.onConnect(mockConnection1, {} as any);
      await server.onConnect(mockConnection2, {} as any);
      await server.onConnect(mockConnection3, {} as any);
      
      const joinMessage1: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'player1', name: 'Black Player' },
      };
      await server.onMessage(JSON.stringify(joinMessage1), mockConnection1);
      
      const joinMessage2: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'player2', name: 'White Player' },
      };
      await server.onMessage(JSON.stringify(joinMessage2), mockConnection2);
      
      const joinMessage3: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'spectator1', name: 'Spectator' },
      };
      await server.onMessage(JSON.stringify(joinMessage3), mockConnection3);
      
      sentMessages.clear();
    });

    it('should broadcast moves to all connected players', async () => {
      const moveMessage: ClientToServerMessage = {
        type: ClientMessageType.MAKE_MOVE,
        timestamp: Date.now(),
        position: { x: 3, y: 3 },
      };
      
      await server.onMessage(JSON.stringify(moveMessage), mockConnection1);
      
      const messages1 = sentMessages.get('player1') || [];
      const messages2 = sentMessages.get('player2') || [];
      const messages3 = sentMessages.get('spectator1') || [];
      
      expect(messages1.some(m => m.type === ServerMessageType.MOVE_MADE)).toBe(true);
      expect(messages2.some(m => m.type === ServerMessageType.MOVE_MADE)).toBe(true);
      expect(messages3.some(m => m.type === ServerMessageType.MOVE_MADE)).toBe(true);
    });

    it('should broadcast chat messages to all players', async () => {
      const chatMessage: ClientToServerMessage = {
        type: ClientMessageType.CHAT_MESSAGE,
        timestamp: Date.now(),
        message: 'Hello everyone!',
      };
      
      await server.onMessage(JSON.stringify(chatMessage), mockConnection1);
      
      const messages1 = sentMessages.get('player1') || [];
      const messages2 = sentMessages.get('player2') || [];
      const messages3 = sentMessages.get('spectator1') || [];
      
      expect(messages1.some(m => m.type === ServerMessageType.CHAT_BROADCAST)).toBe(true);
      expect(messages2.some(m => m.type === ServerMessageType.CHAT_BROADCAST)).toBe(true);
      expect(messages3.some(m => m.type === ServerMessageType.CHAT_BROADCAST)).toBe(true);
    });

    it('should exclude sender from player left broadcasts', async () => {
      await server.onClose(mockConnection1);
      
      const messages1 = sentMessages.get('player1') || [];
      const messages2 = sentMessages.get('player2') || [];
      const messages3 = sentMessages.get('spectator1') || [];
      
      // Player1 should not receive their own disconnect message
      expect(messages1.some(m => m.type === ServerMessageType.PLAYER_LEFT)).toBe(false);
      // But others should
      expect(messages2.some(m => m.type === ServerMessageType.PLAYER_LEFT)).toBe(true);
      expect(messages3.some(m => m.type === ServerMessageType.PLAYER_LEFT)).toBe(true);
    });
  });

  describe('Invalid Message Handling', () => {
    beforeEach(async () => {
      await server.onConnect(mockConnection1, {} as any);
      sentMessages.clear();
    });

    it('should handle malformed JSON messages', async () => {
      await server.onMessage('invalid json{', mockConnection1);
      
      const messages = sentMessages.get('player1') || [];
      const errorMessage = messages.find(m => m.type === ServerMessageType.ERROR);
      expect(errorMessage).toBeDefined();
      expect(errorMessage).toMatchObject({
        type: ServerMessageType.ERROR,
        error: 'Failed to process message',
        code: ErrorCode.INVALID_MESSAGE,
      });
    });

    it('should handle unknown message types', async () => {
      const unknownMessage = {
        type: 'unknown_type',
        timestamp: Date.now(),
      };
      
      await server.onMessage(JSON.stringify(unknownMessage), mockConnection1);
      
      const messages = sentMessages.get('player1') || [];
      const errorMessage = messages.find(m => m.type === ServerMessageType.ERROR);
      expect(errorMessage).toBeDefined();
      expect(errorMessage).toMatchObject({
        type: ServerMessageType.ERROR,
        error: 'Unknown message type',
        code: ErrorCode.INVALID_MESSAGE,
      });
    });

    it('should handle missing required fields', async () => {
      const incompleteMessage = {
        type: ClientMessageType.MAKE_MOVE,
        // missing position and timestamp
      };
      
      await server.onMessage(JSON.stringify(incompleteMessage), mockConnection1);
      
      const messages = sentMessages.get('player1') || [];
      const errorMessage = messages.find(m => m.type === ServerMessageType.ERROR);
      expect(errorMessage).toBeDefined();
    });
  });

  describe('Scoring Phase', () => {
    beforeEach(async () => {
      // Set up game and get to scoring phase
      await server.onConnect(mockConnection1, {} as any);
      await server.onConnect(mockConnection2, {} as any);
      
      const joinMessage1: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'player1', name: 'Black Player' },
      };
      await server.onMessage(JSON.stringify(joinMessage1), mockConnection1);
      
      const joinMessage2: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'player2', name: 'White Player' },
      };
      await server.onMessage(JSON.stringify(joinMessage2), mockConnection2);
      
      // Both players pass to enter scoring
      const passMessage1: ClientToServerMessage = {
        type: ClientMessageType.PASS,
        timestamp: Date.now(),
      };
      await server.onMessage(JSON.stringify(passMessage1), mockConnection1);
      
      const passMessage2: ClientToServerMessage = {
        type: ClientMessageType.PASS,
        timestamp: Date.now(),
      };
      await server.onMessage(JSON.stringify(passMessage2), mockConnection2);
      
      sentMessages.clear();
    });

    it('should allow marking dead stones in scoring phase', async () => {
      const markDeadMessage: ClientToServerMessage = {
        type: ClientMessageType.MARK_DEAD,
        timestamp: Date.now(),
        position: { x: 3, y: 3 },
      };
      
      // First place a stone to mark as dead
      await server.onMessage(JSON.stringify({
        type: ClientMessageType.RESUME_PLAYING,
        timestamp: Date.now(),
      }), mockConnection1);
      
      const moveMessage: ClientToServerMessage = {
        type: ClientMessageType.MAKE_MOVE,
        timestamp: Date.now(),
        position: { x: 3, y: 3 },
      };
      await server.onMessage(JSON.stringify(moveMessage), mockConnection1);
      
      // Pass to get back to scoring
      await server.onMessage(JSON.stringify({ type: ClientMessageType.PASS, timestamp: Date.now() }), mockConnection2);
      await server.onMessage(JSON.stringify({ type: ClientMessageType.PASS, timestamp: Date.now() }), mockConnection1);
      
      sentMessages.clear();
      
      await server.onMessage(JSON.stringify(markDeadMessage), mockConnection1);
      
      const messages1 = sentMessages.get('player1') || [];
      const messages2 = sentMessages.get('player2') || [];
      
      expect(messages1.some(m => m.type === ServerMessageType.DEAD_STONES_MARKED)).toBe(true);
      expect(messages2.some(m => m.type === ServerMessageType.DEAD_STONES_MARKED)).toBe(true);
    });

    it('should prevent spectators from marking dead stones', async () => {
      await server.onConnect(mockConnection3, {} as any);
      const joinMessage3: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'spectator1', name: 'Spectator' },
      };
      await server.onMessage(JSON.stringify(joinMessage3), mockConnection3);
      
      const markDeadMessage: ClientToServerMessage = {
        type: ClientMessageType.MARK_DEAD,
        timestamp: Date.now(),
        position: { x: 3, y: 3 },
      };
      
      await server.onMessage(JSON.stringify(markDeadMessage), mockConnection3);
      
      const messages = sentMessages.get('spectator1') || [];
      const errorMessage = messages.find(m => m.type === ServerMessageType.ERROR);
      expect(errorMessage).toBeDefined();
      expect(errorMessage).toMatchObject({
        type: ServerMessageType.ERROR,
        error: 'Only players can mark dead stones',
        code: ErrorCode.UNAUTHORIZED,
      });
    });

    it('should allow finalizing game', async () => {
      const finalizeMessage: ClientToServerMessage = {
        type: ClientMessageType.FINALIZE_GAME,
        timestamp: Date.now(),
      };
      
      await server.onMessage(JSON.stringify(finalizeMessage), mockConnection1);
      
      const messages1 = sentMessages.get('player1') || [];
      const messages2 = sentMessages.get('player2') || [];
      
      expect(messages1.some(m => m.type === ServerMessageType.GAME_FINALIZED)).toBe(true);
      expect(messages2.some(m => m.type === ServerMessageType.GAME_FINALIZED)).toBe(true);
    });

    it('should allow resuming playing from scoring', async () => {
      const resumeMessage: ClientToServerMessage = {
        type: ClientMessageType.RESUME_PLAYING,
        timestamp: Date.now(),
      };
      
      await server.onMessage(JSON.stringify(resumeMessage), mockConnection1);
      
      const messages1 = sentMessages.get('player1') || [];
      const messages2 = sentMessages.get('player2') || [];
      
      expect(messages1.some(m => m.type === ServerMessageType.GAME_RESUMED)).toBe(true);
      expect(messages2.some(m => m.type === ServerMessageType.GAME_RESUMED)).toBe(true);
      expect(messages1.some(m => m.type === ServerMessageType.GAME_STATE_UPDATE)).toBe(true);
      expect(messages2.some(m => m.type === ServerMessageType.GAME_STATE_UPDATE)).toBe(true);
    });
  });

  describe('Disconnection and Reconnection Scenarios', () => {
    beforeEach(async () => {
      await server.onConnect(mockConnection1, {} as any);
      await server.onConnect(mockConnection2, {} as any);
      
      const joinMessage1: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'player1', name: 'Black Player' },
      };
      await server.onMessage(JSON.stringify(joinMessage1), mockConnection1);
      
      const joinMessage2: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'player2', name: 'White Player' },
      };
      await server.onMessage(JSON.stringify(joinMessage2), mockConnection2);
      
      sentMessages.clear();
    });

    it('should mark player as disconnected on close', async () => {
      await server.onClose(mockConnection1);
      
      const messages2 = sentMessages.get('player2') || [];
      const playerLeft = messages2.find(m => m.type === ServerMessageType.PLAYER_LEFT);
      expect(playerLeft).toBeDefined();
      expect(playerLeft).toMatchObject({
        type: ServerMessageType.PLAYER_LEFT,
        playerId: 'player1',
      });
    });

    it('should handle reconnection gracefully', async () => {
      // Disconnect
      await server.onClose(mockConnection1);
      
      // Reconnect with same ID
      const newConnection = new MockConnection('player1');
      const originalSend = newConnection.send;
      newConnection.send = vi.fn((message: string) => {
        if (!sentMessages.has('player1')) sentMessages.set('player1', []);
        sentMessages.get('player1')!.push(JSON.parse(message));
        return originalSend.call(newConnection, message);
      });
      
      await server.onConnect(newConnection, {} as any);
      
      const joinMessage: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'player1', name: 'Black Player' },
      };
      await server.onMessage(JSON.stringify(joinMessage), newConnection);
      
      const messages = sentMessages.get('player1') || [];
      expect(messages.some(m => m.type === ServerMessageType.ROLE_ASSIGNED)).toBe(true);
      expect(messages.some(m => m.type === ServerMessageType.GAME_STATE_UPDATE)).toBe(true);
    });

    it('should continue game after player disconnection', async () => {
      // Player 1 disconnects
      await server.onClose(mockConnection1);
      
      // Player 2 should still be able to make moves if it's their turn
      const moveMessage: ClientToServerMessage = {
        type: ClientMessageType.MAKE_MOVE,
        timestamp: Date.now(),
        position: { x: 3, y: 3 },
      };
      
      // First make it white's turn by having black pass
      const newBlackConnection = new MockConnection('player1');
      await server.onConnect(newBlackConnection, {} as any);
      const rejoinMessage: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'player1', name: 'Black Player' },
      };
      await server.onMessage(JSON.stringify(rejoinMessage), newBlackConnection);
      
      const passMessage: ClientToServerMessage = {
        type: ClientMessageType.PASS,
        timestamp: Date.now(),
      };
      await server.onMessage(JSON.stringify(passMessage), newBlackConnection);
      
      sentMessages.clear();
      
      // Now white can move
      await server.onMessage(JSON.stringify(moveMessage), mockConnection2);
      
      const messages2 = sentMessages.get('player2') || [];
      expect(messages2.some(m => m.type === ServerMessageType.MOVE_MADE)).toBe(true);
    });
  });

  describe('Backend Integration', () => {
    beforeEach(() => {
      mockFetch.mockClear();
    });

    it('should attempt to save game to backend on completion', async () => {
      await server.onConnect(mockConnection1, {} as any);
      await server.onConnect(mockConnection2, {} as any);
      
      const joinMessage1: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'player1', name: 'Black Player' },
      };
      await server.onMessage(JSON.stringify(joinMessage1), mockConnection1);
      
      const joinMessage2: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'player2', name: 'White Player' },
      };
      await server.onMessage(JSON.stringify(joinMessage2), mockConnection2);
      
      // Mock successful fetch response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('OK'),
      });
      
      // Resign to end game
      const resignMessage: ClientToServerMessage = {
        type: ClientMessageType.RESIGN,
        timestamp: Date.now(),
      };
      await server.onMessage(JSON.stringify(resignMessage), mockConnection1);
      
      // Wait a bit for async backend call
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/game/webhook/partykit'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-webhook-secret': expect.any(String),
          }),
          body: expect.any(String),
        })
      );
    });

    it('should handle backend save errors gracefully', async () => {
      await server.onConnect(mockConnection1, {} as any);
      await server.onConnect(mockConnection2, {} as any);
      
      const joinMessage1: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'player1', name: 'Black Player' },
      };
      await server.onMessage(JSON.stringify(joinMessage1), mockConnection1);
      
      const joinMessage2: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'player2', name: 'White Player' },
      };
      await server.onMessage(JSON.stringify(joinMessage2), mockConnection2);
      
      // Mock failed fetch response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Server Error'),
      });
      
      const resignMessage: ClientToServerMessage = {
        type: ClientMessageType.RESIGN,
        timestamp: Date.now(),
      };
      
      // Should not throw even if backend save fails
      await expect(server.onMessage(JSON.stringify(resignMessage), mockConnection1)).resolves.not.toThrow();
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle empty message gracefully', async () => {
      await server.onConnect(mockConnection1, {} as any);
      
      await server.onMessage('', mockConnection1);
      
      const messages = sentMessages.get('player1') || [];
      const errorMessage = messages.find(m => m.type === ServerMessageType.ERROR);
      expect(errorMessage).toBeDefined();
    });

    it('should handle message with invalid timestamp', async () => {
      await server.onConnect(mockConnection1, {} as any);
      
      const invalidMessage = {
        type: ClientMessageType.JOIN,
        timestamp: 'not-a-number',
        playerInfo: { id: 'player1', name: 'Test' },
      };
      
      await server.onMessage(JSON.stringify(invalidMessage), mockConnection1);
      
      // Should still work despite invalid timestamp
      const messages = sentMessages.get('player1') || [];
      expect(messages.length).toBeGreaterThan(0);
    });

    it('should handle concurrent message processing', async () => {
      await server.onConnect(mockConnection1, {} as any);
      await server.onConnect(mockConnection2, {} as any);
      
      const joinMessage1: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'player1', name: 'Player 1' },
      };
      
      const joinMessage2: ClientToServerMessage = {
        type: ClientMessageType.JOIN,
        timestamp: Date.now(),
        playerInfo: { id: 'player2', name: 'Player 2' },
      };
      
      // Send messages concurrently
      await Promise.all([
        server.onMessage(JSON.stringify(joinMessage1), mockConnection1),
        server.onMessage(JSON.stringify(joinMessage2), mockConnection2),
      ]);
      
      // Both should be processed without conflicts
      const messages1 = sentMessages.get('player1') || [];
      const messages2 = sentMessages.get('player2') || [];
      
      expect(messages1.some(m => m.type === ServerMessageType.ROLE_ASSIGNED)).toBe(true);
      expect(messages2.some(m => m.type === ServerMessageType.ROLE_ASSIGNED)).toBe(true);
    });
  });
});