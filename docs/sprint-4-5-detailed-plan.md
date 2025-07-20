# Sprint 4 & 5: Backend Foundation & Real-time Multiplayer

## Phase 2: Multiplayer Core (Weeks 7-10)

Building on the existing sprint structure while keeping the familiar tech stack and incorporating best practices from Sprint 1.

---

## Sprint 4: Backend Foundation (Week 7-8)

### Sprint Goal
Build a robust backend infrastructure using Express and MongoDB that can handle real-time multiplayer Go games with authentication, persistence, and game state management.

### User Stories

#### Epic: User Management
- [ ] As a player, I want to create an account so I can track my games and progress
- [ ] As a player, I want to log in securely so I can access my profile
- [ ] As a player, I want my game history saved so I can review past games
- [ ] As a player, I want to see my statistics so I can track improvement

#### Epic: Game Management
- [ ] As a player, I want to create a new online game so others can join
- [ ] As a player, I want to see available games so I can join one
- [ ] As a player, I want games to persist so I can resume if disconnected
- [ ] As a developer, I need the backend to validate all moves for security

### Technical Tasks

#### Week 7: Core Infrastructure

**1. Project Setup & Configuration**
```typescript
// Express + MongoDB stack as planned
- [ ] Initialize Express server with TypeScript
- [ ] Set up MongoDB with Mongoose
- [ ] Configure Redis for session management
- [ ] Set up environment variables with dotenv
- [ ] Configure Morgan for request logging
- [ ] Set up CORS for frontend communication
- [ ] Configure express-rate-limit for API protection
```

**2. MongoDB Schema Implementation**
```typescript
// Mongoose schemas for game data
- [ ] Create User schema with auth fields
- [ ] Create Game schema with embedded game state
- [ ] Create Move schema for game history
- [ ] Create PlayerStats schema for rankings
- [ ] Add indexes for query optimization
- [ ] Set up schema validation rules
- [ ] Create database seed scripts
```

**3. Authentication System**
```typescript
// JWT implementation as originally planned
- [ ] Implement JWT authentication with jsonwebtoken
- [ ] Create registration endpoint with bcrypt
- [ ] Create login endpoint with validation
- [ ] Implement JWT refresh token logic
- [ ] Create auth middleware for protected routes
- [ ] Add session management with express-session
- [ ] Implement password reset functionality
```

**4. Core API Endpoints**
```typescript
// RESTful API following Express patterns
- [ ] POST /api/auth/register
- [ ] POST /api/auth/login
- [ ] GET  /api/user/profile
- [ ] PUT  /api/user/profile
- [ ] POST /api/user/logout
- [ ] GET  /api/user/stats
```

#### Week 8: Game Logic Integration

**5. Game Engine Backend Integration**
```typescript
// Reuse existing game engine
- [ ] Create GameService using existing GameEngine
- [ ] Implement game state persistence to MongoDB
- [ ] Create move validation middleware
- [ ] Add game factory for different game modes
- [ ] Implement game lifecycle hooks
- [ ] Add error handling for game operations
- [ ] Create game event emitters
```

**6. Game Management API**
```typescript
// Game endpoints as originally planned
- [ ] POST /api/game/create
- [ ] GET  /api/game/list (available games)
- [ ] GET  /api/game/:id
- [ ] POST /api/game/:id/join
- [ ] POST /api/game/:id/move
- [ ] POST /api/game/:id/pass
- [ ] POST /api/game/:id/resign
- [ ] GET  /api/game/:id/history
```

**7. MongoDB Optimization**
```typescript
// MongoDB-specific optimizations
- [ ] Implement MongoDB connection pooling
- [ ] Add compound indexes for common queries
- [ ] Use MongoDB aggregation for statistics
- [ ] Implement data archival strategy
- [ ] Add MongoDB change streams prep
- [ ] Configure replica set for production
- [ ] Set up MongoDB Atlas monitoring
```

**8. Testing & Documentation**
```typescript
// Testing with familiar tools
- [ ] Unit tests with Jest
- [ ] Integration tests with Supertest
- [ ] MongoDB memory server for test DB
- [ ] API documentation with Swagger
- [ ] Create Postman collection
- [ ] Set up GitHub Actions CI/CD
- [ ] Add ESLint and Prettier
```

### MongoDB Schemas

```typescript
// User Schema
const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profile: {
    avatar: String,
    bio: String,
    country: String
  },
  stats: {
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    eloRating: { type: Number, default: 1500 },
    rank: { type: String, default: '30k' }
  },
  createdAt: { type: Date, default: Date.now }
});

// Game Schema
const GameSchema = new Schema({
  blackPlayer: { type: ObjectId, ref: 'User' },
  whitePlayer: { type: ObjectId, ref: 'User' },
  boardSize: { type: Number, enum: [9, 13, 19] },
  gameState: {
    board: [[Number]], // 2D array representation
    currentPlayer: String,
    capturedStones: {
      black: [{ x: Number, y: Number }],
      white: [{ x: Number, y: Number }]
    },
    koPosition: { x: Number, y: Number },
    passCount: Number,
    phase: String
  },
  moves: [{ type: ObjectId, ref: 'Move' }],
  status: { type: String, enum: ['waiting', 'active', 'finished'] },
  winner: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

### Definition of Done (Sprint 4)
- ✅ All endpoints working with proper error handling
- ✅ Authentication works with JWT
- ✅ Game states persist to MongoDB
- ✅ Redis caching for active sessions
- ✅ All tests passing with >80% coverage
- ✅ API documentation complete
- ✅ Deployed to staging environment
- ✅ Response times <100ms for API calls

---

## Sprint 5: Real-time Multiplayer (Week 9-10)

### Sprint Goal
Implement real-time game synchronization using Socket.io, enabling smooth multiplayer gameplay with proper connection handling and state management.

### User Stories

#### Epic: Real-time Gameplay
- [ ] As a player, I want to see opponent moves instantly
- [ ] As a player, I want to reconnect to my game if disconnected
- [ ] As a player, I want to know when my opponent is thinking
- [ ] As a player, I want to chat with my opponent during the game

#### Epic: Matchmaking
- [ ] As a player, I want to find opponents quickly
- [ ] As a player, I want to create private games with friends
- [ ] As a player, I want to spectate ongoing games
- [ ] As a player, I want notifications when it's my turn

### Technical Tasks

#### Week 9: Socket.io Infrastructure

**1. Socket.io Server Setup**
```typescript
// Socket.io as originally planned
- [ ] Set up Socket.io with Express server
- [ ] Configure Socket.io with Redis adapter
- [ ] Implement socket authentication middleware
- [ ] Create namespace for game rooms
- [ ] Add connection error handling
- [ ] Implement reconnection logic
- [ ] Set up socket event logging
```

**2. Game Room Management**
```typescript
// Socket.io room-based architecture
- [ ] Create game room join/leave logic
- [ ] Implement player ready states
- [ ] Add spectator mode support
- [ ] Create room listing functionality
- [ ] Implement private room codes
- [ ] Add room cleanup on disconnect
- [ ] Create room state broadcasting
```

**3. Real-time Event Handlers**
```typescript
// Socket.io events as originally planned
// Client -> Server
socket.on('create-game', { boardSize, timeSettings });
socket.on('join-game', gameId);
socket.on('make-move', { gameId, position });
socket.on('pass', gameId);
socket.on('resign', gameId);
socket.on('mark-dead-stones', { gameId, positions });
socket.on('chat-message', { gameId, message });

// Server -> Client
socket.emit('game-created', gameData);
socket.emit('opponent-joined', opponentData);
socket.emit('move-made', moveData);
socket.emit('game-updated', gameState);
socket.emit('game-ended', result);
socket.emit('opponent-disconnected');
socket.emit('opponent-reconnected');
```

**4. State Synchronization**
```typescript
// MongoDB + Socket.io integration
- [ ] Create GameStateManager service
- [ ] Implement move validation pipeline
- [ ] Add optimistic update handling
- [ ] Create state broadcast system
- [ ] Implement move acknowledgments
- [ ] Add game state recovery
- [ ] Create conflict resolution
```

#### Week 10: Frontend Integration & Polish

**5. Socket.io Client Integration**
```typescript
// React + Socket.io client
- [ ] Create SocketService for React
- [ ] Implement connection management
- [ ] Add event listener cleanup
- [ ] Create custom hooks (useSocket, useGame)
- [ ] Implement reconnection UI
- [ ] Add connection status indicator
- [ ] Create socket debugging tools
```

**6. Frontend Multiplayer Features**
```typescript
// Update existing components
- [ ] Update Game component for multiplayer
- [ ] Add real-time move updates
- [ ] Implement opponent indicators
- [ ] Create game lobby component
- [ ] Add matchmaking UI
- [ ] Implement chat component
- [ ] Add notification system
```

**7. Matchmaking System**
```typescript
// Simple matchmaking with MongoDB
- [ ] Create matchmaking queue collection
- [ ] Implement quick match algorithm
- [ ] Add ELO-based matching
- [ ] Create game invitations
- [ ] Add queue position tracking
- [ ] Implement timeout handling
- [ ] Create match preferences
```

**8. Performance & Polish**
```typescript
// Optimization and features
- [ ] Add Redis caching for active games
- [ ] Implement message compression
- [ ] Create connection pooling
- [ ] Add latency compensation
- [ ] Implement sound notifications
- [ ] Add desktop notifications
- [ ] Create activity indicators
```

### Socket.io Best Practices

#### Connection Management
```typescript
// Robust connection handling
io.on('connection', (socket) => {
  // Authentication
  const userId = socket.handshake.auth.userId;
  
  // Join user room
  socket.join(`user:${userId}`);
  
  // Rejoin active games
  const activeGames = await getActiveGames(userId);
  activeGames.forEach(game => {
    socket.join(`game:${game.id}`);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    // Mark as disconnected but don't remove from game
    handlePlayerDisconnect(userId);
  });
});
```

#### State Management Pattern
```typescript
// Server-authoritative with optimistic updates
class GameStateManager {
  // MongoDB for persistence
  private gameModel: Model<Game>;
  
  // Redis for active games
  private redis: Redis;
  
  // Socket.io for real-time
  private io: Server;
  
  async makeMove(gameId: string, move: Move) {
    // 1. Validate move
    const isValid = await this.validateMove(gameId, move);
    
    // 2. Update MongoDB
    await this.gameModel.findByIdAndUpdate(gameId, updates);
    
    // 3. Update Redis cache
    await this.redis.set(`game:${gameId}`, gameState);
    
    // 4. Broadcast to room
    this.io.to(`game:${gameId}`).emit('move-made', move);
  }
}
```

### Testing Strategy

#### Sprint 5 Specific Tests
```typescript
// Socket.io testing
- [ ] Connection establishment tests
- [ ] Authentication flow tests  
- [ ] Room join/leave tests
- [ ] Event emission tests
- [ ] Disconnection handling tests
- [ ] Reconnection tests
- [ ] Load testing with Artillery
- [ ] Cross-browser testing
```

### Performance Targets

- Socket.io message latency: <100ms
- Concurrent connections: 5000+
- Move validation: <20ms
- State sync: <150ms
- Reconnection time: <3s

### Definition of Done (Sprint 5)
- ✅ Real-time moves working smoothly
- ✅ Reconnection handles gracefully
- ✅ No moves lost during disconnects
- ✅ Chat and notifications working
- ✅ Supports 500+ concurrent games
- ✅ All tests passing
- ✅ Deployed to production
- ✅ Monitoring configured

---

## Technical Stack Summary

### Backend (Familiar Stack)
```json
{
  "server": {
    "express": "^4.18.0",
    "socket.io": "^4.0.0",
    "cors": "^2.8.0"
  },
  "database": {
    "mongoose": "^7.0.0",
    "redis": "^4.0.0"
  },
  "auth": {
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.0.0",
    "express-session": "^1.17.0"
  },
  "utilities": {
    "dotenv": "^16.0.0",
    "morgan": "^1.10.0",
    "express-rate-limit": "^6.0.0"
  }
}
```

### Key Architecture Decisions

1. **MongoDB for flexibility** - Document structure perfect for game states
2. **Express for familiarity** - Well-documented, huge ecosystem
3. **Socket.io for real-time** - Reliable, feature-rich, great fallbacks
4. **Redis for performance** - Cache active games and sessions
5. **JWT for stateless auth** - Scalable authentication

This plan maintains your preferred tech stack while incorporating modern patterns and best practices. The focus is on building a solid multiplayer foundation that you can comfortably work with and extend.