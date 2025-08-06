# Go Game Multiplayer Guide

## Overview
The Go game now supports real-time multiplayer using PartyKit. Players can create rooms, join existing games, and play Go with others online.

## Features Implemented

### 1. Room Management
- **Create New Room**: Generate a unique room ID and become the first player
- **Join Room**: Enter an existing room ID to join as second player or spectator
- **Leave Room**: Disconnect and return to menu
- **Room Sharing**: Copy room ID to clipboard for easy sharing

### 2. Player Roles
- **Black Player**: First player to join gets black stones (plays first)
- **White Player**: Second player gets white stones
- **Spectator**: Additional players can watch the game

### 3. Game Rules Enforcement
- **Turn-based Play**: Only current player can make moves
- **Ko Rule**: Prevents immediate recapture
- **Suicide Rule**: Prevents self-capture moves
- **Scoring Phase**: Both players can mark dead stones
- **Game End**: By resignation, or agreement after scoring

### 4. Real-time Features
- **Move Synchronization**: All moves instantly visible to all players
- **Connection Status**: Shows when players connect/disconnect
- **Notifications**: Visual feedback for moves, captures, and game events

## How to Play Multiplayer

### Starting Servers

1. **Start PartyKit Server** (in one terminal):
   ```bash
   cd apps/go-game-partykit
   npx partykit dev
   ```

2. **Start Frontend** (in another terminal):
   ```bash
   npx nx serve go-game
   ```

### Creating a Game

1. Open http://localhost:4200
2. Click "Switch to Multiplayer"
3. Choose "Create New Room"
4. Enter your name
5. Share the room ID with your opponent

### Joining a Game

1. Open http://localhost:4200
2. Click "Switch to Multiplayer"
3. Choose "Join Existing Room"
4. Enter your name and the room ID
5. Click "Join Room"

### Playing the Game

1. **Black plays first** - Click on any intersection to place a stone
2. **Alternate turns** - Players take turns placing stones
3. **Capture** - Surround opponent stones to capture them
4. **Pass** - Click Pass if you don't want to place a stone
5. **Two passes** - Game enters scoring phase after both players pass
6. **Mark dead stones** - Click groups to mark as dead during scoring
7. **Finalize** - Accept the score to end the game

### Game Controls

- **Pass**: Skip your turn
- **Resign**: Give up and end the game
- **New Game**: Leave current room and create a new one
- **Leave Room**: Exit to main menu

## URL Parameters

You can join games directly using URL parameters:
- `http://localhost:4200?room=ROOM_ID&name=YOUR_NAME`

## Technical Implementation

### Architecture
- **Frontend**: React + Mantine UI + PartyKit client
- **Backend**: PartyKit server with game engine
- **Protocol**: WebSocket with typed messages
- **State Management**: Server authoritative, client receives updates

### Key Components
- `MultiplayerGame.tsx`: Main multiplayer UI component
- `partykit-client.ts`: WebSocket client wrapper
- `main.ts` (PartyKit): Server-side game logic
- `partykit-protocol.ts`: Shared message types

### Security & Validation
- All moves validated server-side
- Turn enforcement prevents out-of-turn moves
- Game rules strictly enforced
- Spectators cannot interfere with gameplay

## Troubleshooting

### "Not Your Turn" Message
- Only the current player can make moves
- Check the turn indicator to see whose turn it is

### Connection Issues
- Ensure PartyKit server is running on port 1999
- Check browser console for WebSocket errors
- Try refreshing the page

### Can't Create/Join Room
- Make sure to enter a name
- For joining, ensure room ID is correct
- Check that room hasn't been closed

## Future Enhancements
- Persistent game history
- ELO rating system
- Tournament support
- Chat functionality
- Replay system