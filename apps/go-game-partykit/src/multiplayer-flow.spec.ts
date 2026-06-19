import { beforeEach, describe, expect, it, vi } from 'vitest';
import GoGameServer from './main';
import { MockConnection, MockParty } from './test-setup';
import {
  ClientMessageType,
  ErrorCode,
  PlayerRole,
  ServerMessageType,
  type ClientToServerMessage,
  type PublicRoomListResponse,
  type ServerToClientMessage,
} from '@go-game/partykit-protocol';
import { Player } from '@go-game/types';

type TrackedConnection = MockConnection & {
  messages: ServerToClientMessage[];
};

let roomSequence = 0;

function uniqueRoomId(prefix: string) {
  roomSequence += 1;
  return `${prefix}-${Date.now()}-${roomSequence}`;
}

function authTokenForUser(userId: string) {
  return `test-token:${userId}`;
}

function userIdFromAuthHeader(headers: HeadersInit | undefined) {
  if (!headers) return null;
  const authorization =
    headers instanceof Headers
      ? headers.get('Authorization')
      : Array.isArray(headers)
        ? headers.find(([key]) => key.toLowerCase() === 'authorization')?.[1]
        : headers.Authorization ?? headers.authorization;

  if (!authorization?.startsWith('Bearer test-token:')) {
    return null;
  }

  return authorization.slice('Bearer test-token:'.length);
}

function createTrackedConnection(id: string): TrackedConnection {
  const connection = new MockConnection(id) as TrackedConnection;
  connection.messages = [];
  connection.send = vi.fn((message: string | ArrayBuffer | Uint8Array) => {
    if (typeof message !== 'string') {
      throw new Error('Expected server message to be serialized JSON');
    }

    connection.messages.push(JSON.parse(message) as ServerToClientMessage);
  });

  return connection;
}

function clearMessages(...connections: TrackedConnection[]) {
  connections.forEach((connection) => {
    connection.messages = [];
  });
}

function lastMessageOfType(
  connection: TrackedConnection,
  type: ServerMessageType
) {
  return connection.messages.filter((message) => message.type === type).at(-1);
}

async function connectAndJoin(
  server: GoGameServer,
  connection: TrackedConnection,
  name: string,
  options: {
    userId?: string;
    authToken?: string;
    requestedRole?: PlayerRole;
    isPrivate?: boolean;
  } = {}
) {
  await server.onConnect(connection, {} as never);

  const joinMessage: ClientToServerMessage = {
    type: ClientMessageType.JOIN,
    timestamp: Date.now(),
    playerInfo: {
      id: connection.id,
      name,
      userId: options.userId,
    },
    authToken:
      options.authToken ??
      (options.userId ? authTokenForUser(options.userId) : undefined),
    requestedRole: options.requestedRole,
    roomConfig:
      options.isPrivate === undefined
        ? undefined
        : { isPrivate: options.isPrivate },
  };

  await server.onMessage(JSON.stringify(joinMessage), connection);
}

async function makeMove(
  server: GoGameServer,
  connection: TrackedConnection,
  x: number,
  y: number
) {
  const moveMessage: ClientToServerMessage = {
    type: ClientMessageType.MAKE_MOVE,
    timestamp: Date.now(),
    position: { x, y },
  };

  await server.onMessage(JSON.stringify(moveMessage), connection);
}

async function createTwoPlayerGame(prefix: string) {
  const roomId = uniqueRoomId(prefix);
  const server = new GoGameServer(new MockParty(roomId));
  const black = createTrackedConnection(`${roomId}-black`);
  const white = createTrackedConnection(`${roomId}-white`);

  await connectAndJoin(server, black, 'Black Player', {
    userId: `${roomId}-black-user`,
  });
  await connectAndJoin(server, white, 'White Player', {
    userId: `${roomId}-white-user`,
  });
  clearMessages(black, white);

  return { roomId, server, black, white };
}

async function listPublicRooms() {
  const lobby = new GoGameServer(new MockParty('lobby'));
  const response = await lobby.onRequest(
    new Request('https://go-game.test/parties/main/lobby/rooms') as never
  );

  expect(response.status).toBe(200);
  return (await response.json()) as PublicRoomListResponse;
}

describe('multiplayer two-user flow', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const userId = userIdFromAuthHeader(init?.headers);

        if (!userId) {
          return new Response(JSON.stringify({ success: false }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              user: {
                id: userId,
                username: userId,
              },
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
    );
  });

  it('advertises a public waiting room, starts with two players, and removes the listing', async () => {
    const roomId = uniqueRoomId('public-flow');
    const server = new GoGameServer(new MockParty(roomId));
    const black = createTrackedConnection(`${roomId}-black`);
    const white = createTrackedConnection(`${roomId}-white`);

    await connectAndJoin(server, black, 'Ada', { isPrivate: false });

    const waitingRooms = await listPublicRooms();
    const waitingRoom = waitingRooms.rooms.find((room) => room.id === roomId);

    expect(waitingRooms.waitingTimeoutMs).toBe(5 * 60 * 1000);
    expect(waitingRoom).toMatchObject({
      id: roomId,
      playerNames: ['Ada'],
      playerCount: 1,
      spectatorCount: 0,
    });
    expect(
      new Date(waitingRoom!.waitingExpiresAt).getTime() - Date.now()
    ).toBeGreaterThan(4 * 60 * 1000);
    expect(
      lastMessageOfType(black, ServerMessageType.ROLE_ASSIGNED)
    ).toMatchObject({
      role: PlayerRole.BLACK_PLAYER,
      playerId: black.id,
    });

    await connectAndJoin(server, white, 'Grace');

    expect(
      lastMessageOfType(white, ServerMessageType.ROLE_ASSIGNED)
    ).toMatchObject({
      role: PlayerRole.WHITE_PLAYER,
      playerId: white.id,
    });
    expect(
      black.messages.some(
        (message) => message.type === ServerMessageType.GAME_STARTED
      )
    ).toBe(true);
    expect(
      white.messages.some(
        (message) => message.type === ServerMessageType.GAME_STARTED
      )
    ).toBe(true);

    const fullRooms = await listPublicRooms();
    expect(fullRooms.rooms.some((room) => room.id === roomId)).toBe(false);
  });

  it('removes public waiting rooms when the five-minute window expires', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    try {
      const roomId = uniqueRoomId('expired-waiting-flow');
      const server = new GoGameServer(new MockParty(roomId));
      const black = createTrackedConnection(`${roomId}-black`);

      await connectAndJoin(server, black, 'Timeout Host', { isPrivate: false });

      const waitingRooms = await listPublicRooms();
      expect(waitingRooms.rooms.some((room) => room.id === roomId)).toBe(true);

      vi.setSystemTime(new Date(now.getTime() + 5 * 60 * 1000 + 1));

      const expiredRooms = await listPublicRooms();
      expect(expiredRooms.rooms.some((room) => room.id === roomId)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('removes public waiting rooms when the host disconnects before an opponent joins', async () => {
    const roomId = uniqueRoomId('waiting-host-left-flow');
    const server = new GoGameServer(new MockParty(roomId));
    const black = createTrackedConnection(`${roomId}-black`);

    await connectAndJoin(server, black, 'Waiting Host', { isPrivate: false });

    const waitingRooms = await listPublicRooms();
    expect(waitingRooms.rooms.some((room) => room.id === roomId)).toBe(true);

    await server.onClose(black);

    const roomsAfterDisconnect = await listPublicRooms();
    expect(roomsAfterDisconnect.rooms.some((room) => room.id === roomId)).toBe(
      false
    );
  });

  it('keeps private rooms hidden while still allowing direct two-player play', async () => {
    const roomId = uniqueRoomId('private-flow');
    const server = new GoGameServer(new MockParty(roomId));
    const black = createTrackedConnection(`${roomId}-black`);
    const white = createTrackedConnection(`${roomId}-white`);

    await connectAndJoin(server, black, 'Private Host', { isPrivate: true });

    const waitingRooms = await listPublicRooms();
    expect(waitingRooms.rooms.some((room) => room.id === roomId)).toBe(false);

    await connectAndJoin(server, white, 'Invited Opponent');

    expect(
      lastMessageOfType(black, ServerMessageType.GAME_STARTED)
    ).toBeDefined();
    expect(
      lastMessageOfType(white, ServerMessageType.GAME_STARTED)
    ).toBeDefined();
  });

  it('enforces alternating turns across both players', async () => {
    const { server, black, white } = await createTwoPlayerGame('turn-flow');

    await makeMove(server, white, 3, 3);
    expect(lastMessageOfType(white, ServerMessageType.ERROR)).toMatchObject({
      error: 'Not your turn',
      code: ErrorCode.NOT_YOUR_TURN,
    });

    clearMessages(black, white);
    await makeMove(server, black, 3, 3);

    expect(lastMessageOfType(black, ServerMessageType.MOVE_MADE)).toMatchObject(
      {
        move: expect.objectContaining({
          player: Player.BLACK,
          position: { x: 3, y: 3 },
        }),
        gameState: expect.objectContaining({
          currentPlayer: Player.WHITE,
        }),
      }
    );
    expect(lastMessageOfType(white, ServerMessageType.MOVE_MADE)).toBeDefined();

    clearMessages(black, white);
    await makeMove(server, black, 4, 4);
    expect(lastMessageOfType(black, ServerMessageType.ERROR)).toMatchObject({
      error: 'Not your turn',
      code: ErrorCode.NOT_YOUR_TURN,
    });

    clearMessages(black, white);
    await makeMove(server, white, 4, 4);
    expect(lastMessageOfType(white, ServerMessageType.MOVE_MADE)).toMatchObject(
      {
        move: expect.objectContaining({
          player: Player.WHITE,
          position: { x: 4, y: 4 },
        }),
        gameState: expect.objectContaining({
          currentPlayer: Player.BLACK,
        }),
      }
    );
  });

  it('lets spectators join an active game, observe updates, and prevents moves', async () => {
    const { roomId, server, black, white } = await createTwoPlayerGame(
      'spectator-flow'
    );
    const spectator = createTrackedConnection(`${roomId}-spectator`);

    await makeMove(server, black, 3, 3);
    await connectAndJoin(server, spectator, 'Observer');

    expect(
      lastMessageOfType(spectator, ServerMessageType.ROLE_ASSIGNED)
    ).toMatchObject({
      role: PlayerRole.SPECTATOR,
      playerId: spectator.id,
    });
    expect(
      lastMessageOfType(spectator, ServerMessageType.GAME_STATE_UPDATE)
    ).toMatchObject({
      gameState: expect.objectContaining({
        currentPlayer: Player.WHITE,
        moveHistory: expect.arrayContaining([
          expect.objectContaining({ player: Player.BLACK }),
        ]),
      }),
      players: expect.arrayContaining([
        expect.objectContaining({ role: PlayerRole.BLACK_PLAYER }),
        expect.objectContaining({ role: PlayerRole.WHITE_PLAYER }),
        expect.objectContaining({ role: PlayerRole.SPECTATOR }),
      ]),
    });

    clearMessages(spectator);
    await makeMove(server, spectator, 4, 4);
    expect(lastMessageOfType(spectator, ServerMessageType.ERROR)).toMatchObject(
      {
        error: 'Not your turn',
        code: ErrorCode.NOT_YOUR_TURN,
      }
    );

    clearMessages(spectator);
    await makeMove(server, white, 4, 4);
    expect(
      lastMessageOfType(spectator, ServerMessageType.MOVE_MADE)
    ).toMatchObject({
      move: expect.objectContaining({
        player: Player.WHITE,
      }),
    });
  });

  it('rejoins the same connection id without losing the original player seat', async () => {
    const { server, black, white } = await createTwoPlayerGame(
      'same-id-rejoin-flow'
    );

    await makeMove(server, black, 3, 3);
    clearMessages(white);

    await server.onClose(black);
    expect(
      lastMessageOfType(white, ServerMessageType.PLAYER_LEFT)
    ).toMatchObject({
      playerId: black.id,
    });
    clearMessages(white);

    const rejoinedBlack = createTrackedConnection(black.id);
    await connectAndJoin(server, rejoinedBlack, 'Black Player');

    expect(
      rejoinedBlack.messages.some(
        (message) => message.type === ServerMessageType.GAME_STARTED
      )
    ).toBe(false);
    expect(
      white.messages.some(
        (message) => message.type === ServerMessageType.GAME_STARTED
      )
    ).toBe(false);
    expect(
      lastMessageOfType(rejoinedBlack, ServerMessageType.ROLE_ASSIGNED)
    ).toMatchObject({
      role: PlayerRole.BLACK_PLAYER,
      playerId: rejoinedBlack.id,
    });
    expect(
      lastMessageOfType(rejoinedBlack, ServerMessageType.GAME_STATE_UPDATE)
    ).toMatchObject({
      gameState: expect.objectContaining({
        currentPlayer: Player.WHITE,
        moveHistory: expect.arrayContaining([
          expect.objectContaining({ player: Player.BLACK }),
        ]),
      }),
      players: expect.arrayContaining([
        expect.objectContaining({
          id: rejoinedBlack.id,
          role: PlayerRole.BLACK_PLAYER,
          isConnected: true,
        }),
      ]),
    });

    clearMessages(rejoinedBlack, white);
    await makeMove(server, white, 4, 4);
    expect(
      lastMessageOfType(rejoinedBlack, ServerMessageType.MOVE_MADE)
    ).toMatchObject({
      move: expect.objectContaining({
        player: Player.WHITE,
        position: { x: 4, y: 4 },
      }),
    });
  });

  it('reclaims a disconnected black seat from a new connection using the same user id', async () => {
    const roomId = uniqueRoomId('user-id-rejoin-flow');
    const server = new GoGameServer(new MockParty(roomId));
    const black = createTrackedConnection(`${roomId}-black`);
    const white = createTrackedConnection(`${roomId}-white`);
    const blackUserId = `${roomId}-black-user`;

    await connectAndJoin(server, black, 'Black Player', {
      userId: blackUserId,
    });
    await connectAndJoin(server, white, 'White Player', {
      userId: `${roomId}-white-user`,
    });
    clearMessages(black, white);

    await makeMove(server, black, 3, 3);
    await server.onClose(black);

    const rejoinedBlack = createTrackedConnection(`${roomId}-black-rejoined`);
    await connectAndJoin(server, rejoinedBlack, 'Black Player', {
      userId: blackUserId,
    });

    expect(
      lastMessageOfType(rejoinedBlack, ServerMessageType.ROLE_ASSIGNED)
    ).toMatchObject({
      role: PlayerRole.BLACK_PLAYER,
      playerId: rejoinedBlack.id,
    });
    expect(
      lastMessageOfType(rejoinedBlack, ServerMessageType.GAME_STATE_UPDATE)
    ).toMatchObject({
      players: expect.arrayContaining([
        expect.objectContaining({
          id: rejoinedBlack.id,
          role: PlayerRole.BLACK_PLAYER,
          userId: blackUserId,
          isConnected: true,
        }),
      ]),
    });

    clearMessages(black, rejoinedBlack, white);
    await makeMove(server, white, 4, 4);

    await makeMove(server, black, 5, 5);
    expect(lastMessageOfType(black, ServerMessageType.ERROR)).toMatchObject({
      error: 'Not your turn',
      code: ErrorCode.NOT_YOUR_TURN,
    });

    await makeMove(server, rejoinedBlack, 5, 5);

    expect(
      lastMessageOfType(rejoinedBlack, ServerMessageType.MOVE_MADE)
    ).toMatchObject({
      move: expect.objectContaining({
        player: Player.BLACK,
        position: { x: 5, y: 5 },
      }),
      gameState: expect.objectContaining({
        currentPlayer: Player.WHITE,
      }),
    });
  });

  it('reclaims a disconnected white seat from a new connection using the same user id', async () => {
    const { roomId, server, black, white } = await createTwoPlayerGame(
      'white-user-id-rejoin-flow'
    );
    const whiteUserId = `${roomId}-white-user`;

    await makeMove(server, black, 3, 3);
    await server.onClose(white);

    const rejoinedWhite = createTrackedConnection(`${roomId}-white-rejoined`);
    await connectAndJoin(server, rejoinedWhite, 'White Player', {
      userId: whiteUserId,
    });

    expect(
      lastMessageOfType(rejoinedWhite, ServerMessageType.ROLE_ASSIGNED)
    ).toMatchObject({
      role: PlayerRole.WHITE_PLAYER,
      playerId: rejoinedWhite.id,
    });
    expect(
      lastMessageOfType(rejoinedWhite, ServerMessageType.GAME_STATE_UPDATE)
    ).toMatchObject({
      players: expect.arrayContaining([
        expect.objectContaining({
          id: rejoinedWhite.id,
          role: PlayerRole.WHITE_PLAYER,
          userId: whiteUserId,
          isConnected: true,
        }),
      ]),
    });

    clearMessages(black, white, rejoinedWhite);

    await makeMove(server, white, 4, 4);
    expect(lastMessageOfType(white, ServerMessageType.ERROR)).toMatchObject({
      error: 'Not your turn',
      code: ErrorCode.NOT_YOUR_TURN,
    });

    await makeMove(server, rejoinedWhite, 4, 4);
    expect(
      lastMessageOfType(rejoinedWhite, ServerMessageType.MOVE_MADE)
    ).toMatchObject({
      move: expect.objectContaining({
        player: Player.WHITE,
        position: { x: 4, y: 4 },
      }),
      gameState: expect.objectContaining({
        currentPlayer: Player.BLACK,
      }),
    });
    expect(lastMessageOfType(black, ServerMessageType.MOVE_MADE)).toBeDefined();
  });

  it('rejects a join when the token user does not match the requested user id', async () => {
    const server = new GoGameServer(new MockParty(uniqueRoomId('auth-flow')));
    const connection = createTrackedConnection('auth-mismatch-player');

    await connectAndJoin(server, connection, 'Impostor', {
      userId: 'requested-user',
      authToken: authTokenForUser('different-user'),
    });

    expect(lastMessageOfType(connection, ServerMessageType.ERROR)).toMatchObject({
      error: 'Authentication token does not match user id',
      code: ErrorCode.UNAUTHORIZED,
    });
    expect(
      lastMessageOfType(connection, ServerMessageType.ROLE_ASSIGNED)
    ).toBeUndefined();
  });

  it('saves completed games with a backend-compatible resignation result', async () => {
    const { roomId, server, black } = await createTwoPlayerGame(
      'backend-save-flow'
    );
    const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal('fetch', fetchMock);

    try {
      const resignMessage: ClientToServerMessage = {
        type: ClientMessageType.RESIGN,
        timestamp: Date.now(),
      };

      await server.onMessage(JSON.stringify(resignMessage), black);

      expect(fetchMock).toHaveBeenCalledTimes(1);

      const [url, request] = fetchMock.mock.calls[0] as [
        string,
        RequestInit
      ];
      const payload = JSON.parse(String(request.body));

      expect(url).toBe('http://localhost:8080/api/game/webhook/partykit');
      expect(request.headers).toMatchObject({
        'Content-Type': 'application/json',
        'x-webhook-secret':
          process.env.PARTYKIT_WEBHOOK_SECRET || 'dev-partykit-webhook-secret',
      });
      expect(payload).toMatchObject({
        roomId,
        result: {
          winner: Player.WHITE,
          scores: {
            black: expect.any(Number),
            white: expect.any(Number),
          },
          reason: 'resignation',
        },
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
