# GO Game Engine Demo

This document demonstrates how to use the completed GO game engine with practical examples.

## 🚀 Quick Start

```typescript
import { createQuickGame } from '@go-game/game';
import { Player, MoveType, BoardSize } from '@go-game/types';

// Create a quick 9x9 demo game
const game = createQuickGame();

// Get initial game state
console.log('Game started!');
console.log('Current player:', game.getCurrentPlayer()); // Player.BLACK
console.log('Board size:', game.getGameState().boardSize); // BoardSize.SMALL (9)
```

## 🎯 Basic Game Flow

### 1. Making Moves

```typescript
import { createLocalGame } from '@go-game/game';
import { Player, MoveType, BoardSize } from '@go-game/types';

const game = createLocalGame(BoardSize.SMALL);

// Black places first stone
const result1 = game.makeMove(Player.BLACK, MoveType.PLACE_STONE, { x: 3, y: 3 });
console.log('Move successful:', result1.success); // true
console.log('Current player:', game.getCurrentPlayer()); // Player.WHITE

// White places stone
const result2 = game.makeMove(Player.WHITE, MoveType.PLACE_STONE, { x: 5, y: 5 });
console.log('Move successful:', result2.success); // true

// Try invalid move (position occupied)
const result3 = game.makeMove(Player.BLACK, MoveType.PLACE_STONE, { x: 3, y: 3 });
console.log('Move successful:', result3.success); // false
console.log('Error:', result3.error); // "Position is already occupied"
```

### 2. Captures and Ko Rule

```typescript
// Example of a capture scenario
const game = createLocalGame(BoardSize.SMALL);

// Set up a capture scenario (White stone surrounded by Black)
game.makeMove(Player.BLACK, MoveType.PLACE_STONE, { x: 1, y: 0 });
game.makeMove(Player.WHITE, MoveType.PLACE_STONE, { x: 0, y: 0 });
game.makeMove(Player.BLACK, MoveType.PLACE_STONE, { x: 0, y: 1 });
game.makeMove(Player.WHITE, MoveType.PASS);

// Black captures white stone
const captureResult = game.makeMove(Player.BLACK, MoveType.PLACE_STONE, { x: 1, y: 1 });
console.log('Captured stones:', captureResult.capturedStones); // [{ x: 0, y: 0 }]

// Ko rule prevents immediate recapture
const koAttempt = game.makeMove(Player.WHITE, MoveType.PLACE_STONE, { x: 0, y: 0 });
console.log('Ko violation:', koAttempt.error); // "Move violates the Ko rule"
```

### 3. Game End Conditions

```typescript
const game = createLocalGame(BoardSize.SMALL);

// Both players pass to end the game
game.makeMove(Player.BLACK, MoveType.PASS);
console.log('Pass count:', game.getGameState().passCount); // 1

game.makeMove(Player.WHITE, MoveType.PASS);
console.log('Game phase:', game.getGamePhase()); // GamePhase.SCORING

// Or resign to end immediately
const resignGame = createLocalGame(BoardSize.SMALL);
const resignResult = resignGame.makeMove(Player.BLACK, MoveType.RESIGN);
console.log('Game finished:', resignGame.isGameFinished()); // true
console.log('Winner:', resignResult.newGameState?.score?.winner); // Player.WHITE
```

## 🏭 Game Factory Examples

### Professional Game Setup

```typescript
import { createProfessionalGame } from '@go-game/game';

const proGame = createProfessionalGame({
  black: 'Lee Sedol',
  white: 'AlphaGo',
});

console.log('Board size:', proGame.getGameState().boardSize); // BoardSize.LARGE (19)
console.log('Komi:', proGame.getGameState().komi); // 7.5
console.log('Time settings:', proGame.getGameState().timeSettings);
// { mainTime: 1800, byoyomi: 60, periods: 5 }
```

### Beginner Game Setup

```typescript
import { createBeginnerGame } from '@go-game/game';

const beginnerGame = createBeginnerGame({
  black: 'Student',
  white: 'Teacher',
});

console.log('Board size:', beginnerGame.getGameState().boardSize); // BoardSize.SMALL (9)
console.log('Time settings:', beginnerGame.getGameState().timeSettings);
// { mainTime: 1800, byoyomi: 120, periods: 3 }
```

### Custom Timed Game

```typescript
import { createTimedGame } from '@go-game/game';
import { BoardSize } from '@go-game/types';

const blitzGame = createTimedGame(BoardSize.MEDIUM, 'BLITZ', {
  black: 'Player1',
  white: 'Player2',
});

console.log('Time control:', blitzGame.getGameState().timeSettings);
// { mainTime: 300, byoyomi: 10, periods: 3 }
```

## 📊 Game State Management

### Accessing Game Information

```typescript
const game = createLocalGame(BoardSize.MEDIUM);

// Make some moves
game.makeMove(Player.BLACK, MoveType.PLACE_STONE, { x: 6, y: 6 });
game.makeMove(Player.WHITE, MoveType.PLACE_STONE, { x: 3, y: 9 });

// Access game state (immutable copy)
const gameState = game.getGameState();
console.log('Game ID:', gameState.id);
console.log('Move count:', gameState.moveHistory.length);
console.log('Current player:', gameState.currentPlayer);

// Access specific information
console.log('Last move:', game.getLastMove());
console.log('Captured stones:', game.getCapturedStones());
// { black: 0, white: 0 }

// Check game status
console.log('Game finished:', game.isGameFinished()); // false
console.log('Current phase:', game.getGamePhase()); // GamePhase.PLAYING
```

### Move History and Replay

```typescript
const game = createLocalGame(BoardSize.SMALL);

// Play a few moves
game.makeMove(Player.BLACK, MoveType.PLACE_STONE, { x: 4, y: 4 });
game.makeMove(Player.WHITE, MoveType.PLACE_STONE, { x: 2, y: 2 });
game.makeMove(Player.BLACK, MoveType.PASS);

// Get complete move history
const moveHistory = game.getMoveHistory();
console.log('Total moves:', moveHistory.length); // 3

moveHistory.forEach((move, index) => {
  console.log(`Move ${index + 1}:`, {
    player: move.player,
    type: move.type,
    position: move.position,
    timestamp: move.timestamp,
  });
});
```

## 🔧 Advanced Usage

### Game State Validation

```typescript
const game = createLocalGame(BoardSize.SMALL);

// The engine automatically validates game state
console.log('Valid game state:', game.validateGameState()); // true

// You can also load a saved game state
const savedGameState = game.getGameState();

// Create new engine and load the state
const newGame = createLocalGame(BoardSize.SMALL);
try {
  newGame.loadGameState(savedGameState);
  console.log('Game state loaded successfully');
} catch (error) {
  console.error('Invalid game state:', error.message);
}
```

### Creating New Games

```typescript
const originalGame = createLocalGame(BoardSize.MEDIUM);

// Play some moves...
originalGame.makeMove(Player.BLACK, MoveType.PLACE_STONE, { x: 6, y: 6 });

// Create a new game with same settings
const newGame = originalGame.newGame();
console.log('New game current player:', newGame.getCurrentPlayer()); // Player.BLACK
console.log('New game moves:', newGame.getMoveHistory().length); // 0

// Or create with different settings
const differentGame = originalGame.newGame({
  boardSize: BoardSize.LARGE,
  komi: 6.5,
});
```

## 🎮 Error Handling

```typescript
const game = createLocalGame(BoardSize.SMALL);

// All move operations return detailed results
const result = game.makeMove(Player.BLACK, MoveType.PLACE_STONE, { x: -1, y: 5 });

if (!result.success) {
  console.error('Move failed:', result.error);
  // Handle different error types
  switch (result.error) {
    case 'Invalid board position':
      console.log('Position is outside board bounds');
      break;
    case 'Position is already occupied':
      console.log('Cannot place stone on occupied intersection');
      break;
    case 'Move violates the Ko rule':
      console.log('Ko rule prevents this move');
      break;
    case 'Suicide moves are not allowed':
      console.log('Move would capture own stones without capturing opponent');
      break;
    default:
      console.log('Unknown error');
  }
} else {
  console.log('Move successful!');
  if (result.capturedStones && result.capturedStones.length > 0) {
    console.log('Captured', result.capturedStones.length, 'opponent stones');
  }
}
```

## 📈 Next Steps

With the core game engine complete, you can now:

1. **Build the UI** - Create React components that interact with the game engine
2. **Add multiplayer** - Integrate the engine with WebSocket for real-time play
3. **Implement scoring** - Add territory calculation for game end
4. **Add AI** - Integrate computer opponents
5. **Save/Load games** - Persist game states to database

The game engine is fully functional and ready for integration with any UI framework or backend system!
