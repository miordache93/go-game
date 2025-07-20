# Phase 2: Multiplayer Core - Detailed Implementation Plan

## Executive Summary

Phase 2 transforms the standalone Go game into a real-time multiplayer experience. Based on current best practices (2024-2025) and the existing codebase analysis, this plan outlines a robust architecture that prioritizes performance, scalability, and maintainability.

## Current State Analysis

### What We Have (Sprint 1 Complete)
- ✅ Solid game engine with complete Go rules
- ✅ Clean separation between game logic and UI
- ✅ React/TypeScript frontend with Konva board rendering
- ✅ Nx monorepo structure
- ✅ Type-safe interfaces via `@go-game/types`

### Integration Points Identified
1. **GameEngine class** - Already designed for state serialization
2. **MoveResult interface** - Ready for network transmission
3. **GameState interface** - Immutable and serializable
4. **Component architecture** - Can easily add WebSocket hooks

## Phase 2 Timeline: Weeks 7-10 (4 Weeks)

### Week 7-8: Backend Foundation
### Week 9-10: Real-time Multiplayer Integration

## Technical Architecture Decisions

### 1. Network Architecture

**Decision: Hybrid WebSocket + REST API**

```typescript
// Architecture Overview
┌─────────────────────────────────────────────────────────┐
│                     Frontend                             │
├─────────────────────────────────────────────────────────┤
│  React App                                              │
│  ├── Game Engine (Authoritative Client State)          │
│  ├── WebSocket Client (Real-time Updates)              │
│  └── REST Client (User/Game Management)                │
├─────────────────────────────────────────────────────────┤
│                     Backend                             │
├─────────────────────────────────────────────────────────┤
│  Node.js + Fastify (Better perf than Express)          │
│  ├── WebSocket Server (uWebSockets.js)                 │
│  ├── REST API (User, Matchmaking, Game History)        │
│  ├── Game Session Manager                              │
│  └── Auth Middleware (JWT + Refresh Tokens)            │
├─────────────────────────────────────────────────────────┤
│  PostgreSQL           │  Redis + KeyDB Cluster         │
│  ├── Users           │  ├── Active Game States        │
│  ├── Game History    │  ├── Session Management        │
│  └── Analytics       │  └── Pub/Sub for Scaling       │
└─────────────────────────────────────────────────────────┘
```

**Rationale:**
- WebSockets for real-time game moves (low latency)
- REST for non-real-time operations (matchmaking, profiles)
- uWebSockets.js for 10x better performance than Socket.io
- PostgreSQL for ACID compliance on critical data
- Redis/KeyDB for sub-millisecond game state access

### 2. State Synchronization Strategy

**Decision: Server-Authoritative with Client Prediction**

```typescript
// State Flow
interface NetworkGameState {
  // Server is source of truth
  serverState: GameState;
  
  // Client predicts moves optimistically
  localState: GameState;
  
  // Pending moves awaiting server confirmation
  pendingMoves: Move[];
  
  // Sequence numbers for ordering
  lastConfirmedSequence: number;
  localSequence: number;
}

// Move Flow:
// 1. Client makes move locally (instant feedback)
// 2. Send move to server with sequence number
// 3. Server validates and broadcasts to all clients
// 4. Client reconciles server state with local state
```

**Benefits:**
- Instant UI feedback (no perceived lag)
- Server prevents cheating
- Handles network issues gracefully
- Works well for turn-based games like Go

### 3. Database Schema

**PostgreSQL Schema:**

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(30) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  elo_rating INTEGER DEFAULT 1500,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  black_player_id UUID REFERENCES users(id),
  white_player_id UUID REFERENCES users(id),
  board_size SMALLINT NOT NULL,
  komi DECIMAL(3,1) NOT NULL,
  game_state JSONB NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  winner VARCHAR(5), -- 'black', 'white', 'draw'
  result_reason VARCHAR(20), -- 'resignation', 'timeout', 'completion'
  move_count INTEGER DEFAULT 0,
  sgf_data TEXT -- Store game in SGF format for replay
);

-- Moves table (for move history and analysis)
CREATE TABLE moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  move_number INTEGER NOT NULL,
  player VARCHAR(5) NOT NULL,
  move_type VARCHAR(15) NOT NULL,
  position_x SMALLINT,
  position_y SMALLINT,
  captured_count SMALLINT DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, move_number)
);

-- Indexes for performance
CREATE INDEX idx_games_players ON games(black_player_id, white_player_id);
CREATE INDEX idx_games_active ON games(ended_at) WHERE ended_at IS NULL;
CREATE INDEX idx_moves_game ON moves(game_id, move_number);
```

**Redis Data Structures:**

```typescript
// Active game state
interface RedisGameState {
  key: `game:${gameId}`;
  value: {
    state: GameState;
    players: {
      black: { userId: string; socketId: string; connected: boolean };
      white: { userId: string; socketId: string; connected: boolean };
    };
    lastActivity: number;
    moveTimer: number;
  };
  ttl: 7200; // 2 hours
}

// User session
interface RedisUserSession {
  key: `session:${userId}`;
  value: {
    socketId: string;
    currentGameId?: string;
    status: 'online' | 'playing' | 'away';
  };
  ttl: 3600; // 1 hour
}

// Matchmaking queue
interface RedisMatchmakingQueue {
  key: `matchmaking:${boardSize}:${eloRange}`;
  type: 'sorted_set';
  members: userId[];
  scores: elo_rating[];
}
```

### 4. API Design

**REST Endpoints:**

```typescript
// Authentication
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout

// User Management
GET    /api/users/profile
PUT    /api/users/profile
GET    /api/users/:id/stats
GET    /api/users/leaderboard

// Game Management
POST   /api/games/create
GET    /api/games/:id
GET    /api/games/active
GET    /api/games/history
POST   /api/games/:id/rejoin

// Matchmaking
POST   /api/matchmaking/join
DELETE /api/matchmaking/leave
GET    /api/matchmaking/status
```

**WebSocket Events:**

```typescript
// Client -> Server Events
interface ClientEvents {
  'game:join': { gameId: string; authToken: string };
  'game:move': { gameId: string; move: Move; sequence: number };
  'game:resign': { gameId: string };
  'game:request-draw': { gameId: string };
  'game:mark-dead': { gameId: string; position: Position };
  'game:finalize-score': { gameId: string };
  'game:chat': { gameId: string; message: string };
  'ping': { timestamp: number };
}

// Server -> Client Events
interface ServerEvents {
  'game:joined': { gameState: GameState; players: GamePlayers };
  'game:move-accepted': { move: Move; sequence: number; gameState: GameState };
  'game:move-rejected': { sequence: number; reason: string };
  'game:opponent-moved': { move: Move; gameState: GameState };
  'game:phase-changed': { phase: GamePhase; gameState: GameState };
  'game:ended': { winner: Player; reason: string; finalScore: GameScore };
  'game:opponent-disconnected': { timeRemaining: number };
  'game:opponent-reconnected': {};
  'game:chat': { player: Player; message: string; timestamp: number };
  'game:error': { code: string; message: string };
  'pong': { timestamp: number; latency: number };
}
```

### 5. Security Considerations

**Authentication & Authorization:**
```typescript
// JWT Token Structure
interface AuthToken {
  userId: string;
  username: string;
  iat: number;
  exp: number;
}

// Refresh Token in HTTP-only cookie
interface RefreshToken {
  userId: string;
  tokenId: string; // For revocation
  exp: number;
}
```

**Game Security:**
- Server validates every move
- Rate limiting on move submissions
- WebSocket connections require authentication
- Game state tampering prevention via server authority
- CORS properly configured
- Input sanitization for chat messages

### 6. Performance Optimizations

**Network Optimizations:**
```typescript
// Binary protocol for moves (instead of JSON)
class MoveProtocol {
  static encode(move: Move): Uint8Array {
    // Encode move in ~10 bytes instead of ~100 bytes JSON
    const buffer = new ArrayBuffer(10);
    const view = new DataView(buffer);
    view.setUint8(0, move.type);
    view.setUint8(1, move.player === Player.BLACK ? 0 : 1);
    view.setUint8(2, move.position?.x ?? 255);
    view.setUint8(3, move.position?.y ?? 255);
    view.setUint32(4, move.moveNumber);
    return new Uint8Array(buffer);
  }
  
  static decode(data: Uint8Array): Move {
    // Decode binary back to Move object
  }
}
```

**Caching Strategy:**
- Redis for hot game states
- PostgreSQL for cold storage
- CDN for static assets
- Service Worker for offline support

### 7. Scalability Plan

**Horizontal Scaling Architecture:**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │   Client    │     │   Client    │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┴───────────────────┘
                           │
                    ┌──────▼──────┐
                    │ Nginx/Caddy │
                    │Load Balancer│
                    └──────┬──────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
┌──────▼──────┐     ┌──────▼──────┐     ┌──────▼──────┐
│   Server    │     │   Server    │     │   Server    │
│  Instance 1 │     │  Instance 2 │     │  Instance 3 │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┴───────────────────┘
                           │
                    ┌──────▼──────┐
                    │Redis Cluster│
                    │  Pub/Sub    │
                    └─────────────┘
```

**Scaling Strategies:**
- Sticky sessions for WebSocket connections
- Redis Pub/Sub for cross-server communication
- Kubernetes for container orchestration
- Auto-scaling based on concurrent games

## Implementation Roadmap

### Sprint 4: Backend Foundation (Week 7-8)

**Week 7: Core Backend Setup**
- [ ] Set up Fastify server with TypeScript
- [ ] Implement JWT authentication system
- [ ] Create PostgreSQL schema and migrations
- [ ] Set up Redis/KeyDB connection
- [ ] Implement user registration/login
- [ ] Create game CRUD operations
- [ ] Add comprehensive logging (Winston)

**Week 8: Game Logic Integration**
- [ ] Port GameEngine to backend
- [ ] Implement game session manager
- [ ] Create matchmaking system
- [ ] Add game state persistence
- [ ] Implement move validation on server
- [ ] Create game history storage
- [ ] Add API rate limiting

### Sprint 5: Real-time Multiplayer (Week 9-10)

**Week 9: WebSocket Implementation**
- [ ] Set up uWebSockets.js server
- [ ] Implement authentication for WebSocket
- [ ] Create game room management
- [ ] Implement move synchronization
- [ ] Add connection/disconnection handling
- [ ] Create reconnection logic
- [ ] Add latency compensation

**Week 10: Frontend Integration**
- [ ] Create WebSocket client service
- [ ] Implement optimistic UI updates
- [ ] Add state reconciliation
- [ ] Create multiplayer UI components
- [ ] Implement game lobby
- [ ] Add connection status indicators
- [ ] Create comprehensive error handling

## Testing Strategy

### Unit Tests
```typescript
// Backend game logic
describe('GameSessionManager', () => {
  it('should validate moves before broadcasting', () => {});
  it('should handle player disconnections', () => {});
  it('should restore game state after crash', () => {});
});

// WebSocket communication
describe('WebSocketHandler', () => {
  it('should authenticate connections', () => {});
  it('should rate limit moves', () => {});
  it('should handle binary protocol', () => {});
});
```

### Integration Tests
```typescript
// Full game flow
describe('Multiplayer Game Flow', () => {
  it('should complete a full game between two players', () => {});
  it('should handle network interruptions', () => {});
  it('should sync state across multiple clients', () => {});
});
```

### Load Testing
```yaml
# k6 load test configuration
scenarios:
  game_load:
    executor: 'ramping-vus'
    stages:
      - duration: '5m', target: 100   # 100 concurrent games
      - duration: '10m', target: 500  # 500 concurrent games
      - duration: '5m', target: 1000  # 1000 concurrent games
      - duration: '5m', target: 0     # Ramp down
```

## Monitoring & Observability

### Metrics to Track
```typescript
interface GameMetrics {
  // Performance metrics
  moveLatency: Histogram;         // Time from move to confirmation
  gameStateSize: Histogram;       // Size of game state in bytes
  dbQueryTime: Histogram;         // Database query performance
  
  // Business metrics
  concurrentGames: Gauge;         // Active games
  gamesPerMinute: Counter;        // Game creation rate
  averageGameDuration: Histogram; // Game length
  disconnectionRate: Counter;     // Player disconnections
}
```

### Logging Strategy
```typescript
// Structured logging with correlation IDs
logger.info('Move processed', {
  gameId: game.id,
  playerId: player.id,
  moveNumber: move.moveNumber,
  processingTime: endTime - startTime,
  correlationId: ctx.correlationId
});
```

## Risk Mitigation

### Technical Risks
1. **WebSocket connection stability**
   - Mitigation: Implement robust reconnection with exponential backoff
   - Fallback: Long polling for critical moves

2. **State synchronization issues**
   - Mitigation: Server authoritative with versioning
   - Fallback: Full state refresh on desync

3. **Database performance**
   - Mitigation: Proper indexing and query optimization
   - Fallback: Read replicas for scaling

### Operational Risks
1. **DDoS attacks**
   - Mitigation: Rate limiting, Cloudflare protection
   - Fallback: Circuit breakers

2. **Data loss**
   - Mitigation: Regular backups, write-ahead logging
   - Fallback: Game reconstruction from move history

## Success Criteria

### Performance Targets
- Move latency: < 100ms (p99)
- Game state sync: < 50ms
- Concurrent games: 1000+
- Uptime: 99.9%

### User Experience
- Seamless reconnection
- No lost moves
- Fair matchmaking (ELO-based)
- Responsive UI during network issues

## Future Considerations

### Phase 3 Preparations
- AI opponent integration points
- Tournament system architecture
- Spectator mode infrastructure
- Mobile app considerations

### Technical Debt to Avoid
- Properly abstract game logic
- Use dependency injection
- Comprehensive error handling
- Well-documented APIs
- Automated testing from day one

## Conclusion

This Phase 2 plan provides a solid foundation for multiplayer Go gameplay while maintaining code quality and preparing for future scalability. The architecture decisions prioritize performance, security, and user experience while keeping the codebase maintainable and extensible.

The 4-week timeline is aggressive but achievable with focused development and the strong foundation from Phase 1. The modular architecture ensures that each component can be developed and tested independently, reducing integration risks.