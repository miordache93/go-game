# PartyKit Research for Go Game Multiplayer Implementation

## Executive Summary

PartyKit is a modern edge-first platform for building real-time multiplayer applications, now part of Cloudflare (acquired October 2024). It provides a simpler alternative to traditional WebSocket implementations like Socket.io, with built-in global edge deployment and stateful server capabilities.

## PartyKit Overview

### Key Features
- **Edge-first architecture**: Runs on Cloudflare's global network (within ~50ms of 95% of internet users)
- **Stateful servers**: Each "Party" maintains in-memory state
- **On-demand scaling**: Servers created automatically as needed
- **Simple API**: "Just JavaScript" approach with minimal boilerplate
- **WebSocket + HTTP**: Supports both protocols natively
- **TypeScript-first**: Full TypeScript support out of the box

### Technical Architecture
```typescript
// PartyKit server example
export default class GoGameServer implements Party.Server {
  gameState: GameState;

  constructor(readonly room: Party.Room) {
    this.gameState = createInitialGameState();
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // Send current game state to new player
    conn.send(JSON.stringify(this.gameState));
  }

  onMessage(message: string, sender: Party.Connection) {
    const move = JSON.parse(message);
    // Validate and apply move
    if (this.validateMove(move)) {
      this.applyMove(move);
      // Broadcast to all players
      this.room.broadcast(JSON.stringify(this.gameState));
    }
  }
}
```

## PartyKit vs Socket.io Comparison

### PartyKit Advantages
| Feature | PartyKit | Socket.io |
|---------|----------|-----------|
| **Deployment** | Built-in edge deployment | Self-managed servers |
| **Scaling** | Automatic global scaling | Manual scaling required |
| **State Management** | Built-in stateful servers | External state (Redis) |
| **Infrastructure** | Zero-config edge network | Server provisioning needed |
| **Latency** | ~50ms globally | Depends on server location |
| **Setup Complexity** | Minimal (one file) | Moderate (server + client) |
| **Cost Model** | Pay-per-use | Server hosting costs |

### Socket.io Advantages
| Feature | Socket.io | PartyKit |
|---------|-----------|----------|
| **Ecosystem** | Mature, extensive | Newer, growing |
| **Documentation** | Comprehensive | Good but newer |
| **Community** | Large, established | Smaller but active |
| **Features** | Rooms, namespaces, fallbacks | Core features focused |
| **Control** | Full server control | Platform constraints |
| **Database Integration** | Direct integration | Via HTTP/external |

## Go Game Specific Considerations

### Why PartyKit is Ideal for Go
1. **Turn-based nature**: Go's turn-based gameplay maps perfectly to PartyKit's message-based model
2. **Stateful games**: Each game room maintains its own state naturally
3. **Global reach**: Players worldwide get low-latency connections
4. **Simple state sync**: Game state can be kept in-memory per room
5. **Cost-effective**: Only pay when games are active

### Implementation Architecture

```typescript
// Proposed Go Game PartyKit Architecture
interface GoGameRoom {
  id: string;
  blackPlayer: Connection | null;
  whitePlayer: Connection | null;
  spectators: Connection[];
  gameEngine: GameEngine;
  gameState: GameState;
}

class GoGameServer implements Party.Server {
  room: GoGameRoom;

  async onRequest(req: Party.Request) {
    // HTTP endpoints for game creation, history, etc.
    if (req.method === "POST" && new URL(req.url).pathname === "/create") {
      return this.createGame(req);
    }
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // Assign player or spectator role
    this.assignRole(conn, ctx);
    // Send current game state
    conn.send(this.serializeGameState());
  }

  onMessage(message: string, sender: Party.Connection) {
    const action = JSON.parse(message);
    
    switch (action.type) {
      case "MOVE":
        this.handleMove(action.move, sender);
        break;
      case "PASS":
        this.handlePass(sender);
        break;
      case "RESIGN":
        this.handleResign(sender);
        break;
      case "MARK_DEAD":
        this.handleMarkDead(action.positions, sender);
        break;
    }
  }

  private handleMove(move: Move, sender: Party.Connection) {
    // Validate sender is current player
    if (!this.isCurrentPlayer(sender)) return;
    
    // Validate move with game engine
    const result = this.room.gameEngine.makeMove(move);
    
    if (result.isValid) {
      // Update state
      this.room.gameState = result.newState;
      
      // Broadcast to all connections
      this.room.broadcast(JSON.stringify({
        type: "GAME_UPDATE",
        state: this.room.gameState,
        lastMove: move
      }));
    } else {
      // Send error only to sender
      sender.send(JSON.stringify({
        type: "MOVE_ERROR",
        error: result.error
      }));
    }
  }
}
```

## Implementation Plan

### Phase 1: PartyKit Integration (Week 1)
1. **Setup PartyKit project**
   ```bash
   npm create partykit@latest go-game-server
   ```

2. **Create game server**
   - Implement GoGameServer class
   - Port existing GameEngine to PartyKit
   - Add connection management
   - Implement move validation

3. **Update frontend**
   - Replace local game state with PartyKit client
   - Add connection status UI
   - Implement optimistic updates

### Phase 2: Game Features (Week 2)
1. **Player management**
   - Role assignment (black/white/spectator)
   - Reconnection handling
   - Player presence indicators

2. **Game lifecycle**
   - Game creation/joining
   - Time controls
   - Game completion
   - Result persistence

3. **Enhanced features**
   - Chat functionality
   - Move history
   - Spectator mode
   - Game replay

### Phase 3: Production Features (Week 3)
1. **Persistence layer**
   - Save completed games to external DB
   - User profiles and stats
   - ELO rating system

2. **Matchmaking**
   - Quick match queue
   - Skill-based matching
   - Private game invites

3. **Polish**
   - Error handling
   - Connection resilience
   - Performance optimization

## Migration Strategy

### From Current State to PartyKit
1. **Keep existing game engine** - Reuse all game logic
2. **Replace planned Socket.io** - Use PartyKit instead
3. **Simplify backend** - Less infrastructure needed
4. **Maintain MongoDB** - For user accounts and game history

### API Compatibility
```typescript
// Maintain similar API structure
// Old (Socket.io planned):
socket.emit('make-move', { gameId, position });

// New (PartyKit):
party.send(JSON.stringify({ type: 'MOVE', position }));
```

## Cost Analysis

### PartyKit Pricing (Cloudflare)
- **Free tier**: Generous for development
- **Production**: ~$0.30/million requests
- **WebSocket duration**: ~$0.01/million seconds
- **Estimated for 1000 concurrent games**: ~$50-100/month

### Traditional Hosting (Socket.io)
- **Server costs**: $50-200/month minimum
- **Redis**: $20-50/month
- **Load balancer**: $20-50/month
- **Total**: $90-300/month + maintenance

## Recommendations

### Use PartyKit for Go Game Because:
1. **Simpler architecture** - No need for Redis, load balancers, or complex scaling
2. **Better global performance** - Edge deployment ensures low latency worldwide
3. **Cost-effective** - Pay only for active games
4. **Faster development** - Less infrastructure code to write
5. **Future-proof** - Backed by Cloudflare's infrastructure

### Implementation Priority:
1. Start with PartyKit for multiplayer (skip Socket.io phase)
2. Keep MongoDB for user accounts and game history
3. Use PartyKit's HTTP endpoints for non-real-time features
4. Implement progressive enhancement (works offline, better online)

## Code Examples

### Client Connection
```typescript
// Frontend connection to PartyKit
import PartySocket from "partysocket";

const party = new PartySocket({
  host: "go-game.username.partykit.dev",
  room: gameId,
  id: userId,
});

party.addEventListener("message", (evt) => {
  const update = JSON.parse(evt.data);
  if (update.type === "GAME_UPDATE") {
    updateLocalGameState(update.state);
  }
});

// Making a move
const makeMove = (position: Position) => {
  party.send(JSON.stringify({
    type: "MOVE",
    position
  }));
};
```

### Server State Management
```typescript
// PartyKit server with game state
export default class Server implements Party.Server {
  gameEngine: GameEngine;
  players: Map<string, Party.Connection> = new Map();

  constructor(readonly room: Party.Room) {
    // Initialize game for this room
    this.gameEngine = new GameEngine({
      boardSize: 19,
      komi: 6.5,
      rules: "japanese"
    });
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const userId = ctx.request.headers.get("x-user-id");
    
    // Assign player slot
    if (!this.players.has("black")) {
      this.players.set("black", conn);
      conn.send(JSON.stringify({ type: "ROLE", role: "black" }));
    } else if (!this.players.has("white")) {
      this.players.set("white", conn);
      conn.send(JSON.stringify({ type: "ROLE", role: "white" }));
    } else {
      // Spectator
      conn.send(JSON.stringify({ type: "ROLE", role: "spectator" }));
    }

    // Send current game state
    conn.send(JSON.stringify({
      type: "GAME_STATE",
      state: this.gameEngine.getState()
    }));
  }

  onClose(conn: Party.Connection) {
    // Handle disconnection
    for (const [role, connection] of this.players) {
      if (connection === conn) {
        this.players.delete(role);
        this.room.broadcast(JSON.stringify({
          type: "PLAYER_DISCONNECTED",
          role
        }));
        break;
      }
    }
  }
}
```

## Conclusion

PartyKit offers a compelling alternative to traditional WebSocket implementations for the Go game multiplayer features. Its edge-first architecture, built-in state management, and simple API make it an excellent choice for turn-based games like Go. The platform's recent acquisition by Cloudflare ensures long-term stability and continued improvement.

**Recommendation**: Implement PartyKit instead of Socket.io for Phase 2, saving development time and infrastructure complexity while providing better global performance.