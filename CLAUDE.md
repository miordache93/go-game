# Claude Development Guide

## Important Configuration

### Nx Cloud is DISABLED
This project does NOT use Nx Cloud. All caching is local only.
- The `nxCloudId` has been removed from nx.json
- Environment variable `NX_SKIP_NX_CACHE=true` is set
- Do not use `--skip-nx-cache` flag in commands

## Build Commands

### Frontend
```bash
npx nx build go-game
npx nx serve go-game
```

### Backend API
```bash
npx nx build go-game-api
npx nx serve go-game-api
```

### PartyKit Server
```bash
npx partykit dev
```

## Running All Services

Start all three services for full multiplayer functionality:

1. Backend API (port 8080):
```bash
npx nx serve go-game-api
```

2. PartyKit (port 1999):
```bash
cd apps/go-game-partykit && npx partykit dev
```

3. Frontend (port 4200):
```bash
npx nx serve go-game
```

## Project Structure

- `apps/go-game/` - React frontend application
- `apps/go-game-api/` - Express backend API
- `apps/go-game-partykit/` - PartyKit WebSocket server
- `libs/game/` - Game logic and components
- `libs/shared/` - Shared types and utilities

## State Management

- **Zustand** - Client-side auth and UI state
- **TanStack Query** - Server state and caching
- **PartyKit** - Real-time multiplayer state

## Testing

```bash
# Run all tests
npx nx test

# Run specific project tests
npx nx test go-game
npx nx test game
```

## Type Checking

```bash
# Check all TypeScript files
npx nx run-many --target=typecheck

# Check specific project
npx nx typecheck go-game
```