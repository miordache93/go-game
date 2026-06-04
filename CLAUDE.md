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

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax


<!-- nx configuration end-->