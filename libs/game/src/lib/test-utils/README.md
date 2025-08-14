# GO Game Test Utilities

Comprehensive test utilities and fixtures for Go game testing. These utilities make it easy to write clean, readable tests for the Go game engine with minimal boilerplate.

## Features

- **Board State Builders** - Fluent API for creating test boards
- **Position Generators** - Generate common position patterns
- **Move Sequence Builders** - Create and execute complex move sequences
- **Custom Matchers** - Go-specific assertions and validations
- **ASCII Board Support** - Create boards from ASCII diagrams
- **Pre-built Fixtures** - Common patterns and scenarios
- **Visual Debugging** - Print and compare boards visually
- **Mock Data Generators** - Generate test data for various scenarios

## Quick Start

```typescript
import { board, moveSequence, GoMatchers, Player } from './test-utils';

// Create a board with stones
const testBoard = board(BoardSize.SMALL)
  .black(4, 4)  // Center stone
  .white(2, 2)  // Corner stone
  .build();

// Verify stone placement
expect(GoMatchers.hasStone(testBoard, { x: 4, y: 4 }, Player.BLACK)).toBe(true);

// Create and execute move sequences
const engine = createLocalGame(BoardSize.SMALL);
const results = moveSequence()
  .place(Player.BLACK, 4, 4)
  .place(Player.WHITE, 2, 2)
  .pass(Player.BLACK)
  .executeOn(engine);
```

## Board Builders

### Basic Usage

```typescript
import { board, BoardSize, Player } from './test-utils';

// Empty board
const empty = board(BoardSize.SMALL).build();

// Board with individual stones
const withStones = board(BoardSize.SMALL)
  .black(4, 4)
  .white(2, 2)
  .black(6, 6)
  .build();

// Board with stone patterns
const pattern = board(BoardSize.SMALL)
  .blackStones([[1, 1], [2, 2], [3, 3]])
  .whiteStones([[6, 6], [7, 7]])
  .build();

// Board from template
const template = board(BoardSize.SMALL)
  .pattern({
    black: [[1, 1], [2, 2]],
    white: [[6, 6], [7, 7]],
  })
  .build();
```

### ASCII Board Creation

```typescript
import { ascii, asciiBoard } from './test-utils/board-helpers';

// Using template literals
const board1 = ascii`
  . . . X . . . . .
  . . . . . . . . .
  . . . . O . . . .
  . . . . . . . . .
  . . . . . . . . .
  . . . . . . . . .
  . . . . . . . . .
  . . . . . . . . .
  . . . . . . . . .
`;

// Using string parsing
const board2 = asciiBoard(`
  X . O
  . X .
  O . X
`, BoardSize.SMALL);
```

## Position Generators

```typescript
import { PositionGenerator, BoardSize } from './test-utils';

// Generate corner positions
const corners = PositionGenerator.corners(BoardSize.SMALL);
// Returns: [{ x: 0, y: 0 }, { x: 8, y: 0 }, { x: 0, y: 8 }, { x: 8, y: 8 }]

// Generate edge positions (excluding corners)
const edges = PositionGenerator.edges(BoardSize.SMALL);

// Generate center area
const center = PositionGenerator.center(BoardSize.SMALL, 2); // radius 2

// Generate line between two points
const line = PositionGenerator.line({ x: 0, y: 0 }, { x: 3, y: 0 });

// Generate random positions
const random = PositionGenerator.random(BoardSize.SMALL, 5);
```

## Move Sequences

```typescript
import { moveSequence, Player, MoveType } from './test-utils';

// Build move sequence
const sequence = moveSequence()
  .place(Player.BLACK, 4, 4)
  .place(Player.WHITE, 2, 2)
  .place(Player.BLACK, 6, 6)
  .pass(Player.WHITE)
  .resign(Player.BLACK);

// Execute on engine
const engine = createLocalGame();
const results = sequence.executeOn(engine);

// Check results
results.forEach(result => {
  expect(result.success).toBe(true);
});

// Alternating moves shorthand
const alternating = moveSequence()
  .alternating([
    [4, 4], [2, 2], [6, 6], [2, 6]
  ])
  .executeOn(engine);
```

## Custom Matchers

```typescript
import { GoMatchers, Player } from './test-utils';

// Stone placement matchers
expect(GoMatchers.hasStone(board, { x: 4, y: 4 }, Player.BLACK)).toBe(true);
expect(GoMatchers.isEmpty(board, { x: 0, y: 0 })).toBe(true);

// Move result matchers
expect(GoMatchers.isMoveSuccess(moveResult)).toBe(true);
expect(GoMatchers.isMoveFailure(moveResult, 'occupied')).toBe(true);

// Group validation
expect(GoMatchers.formGroup(board, positions)).toBe(true);

// Game state validation
expect(GoMatchers.isValidGameState(gameState)).toBe(true);
```

## Game State Factories

```typescript
import { GameStateFactory, Player, BoardSize } from './test-utils';

// Fresh game
const fresh = GameStateFactory.fresh(BoardSize.SMALL);

// Game with moves
const withMoves = GameStateFactory.withMoves([
  { player: Player.BLACK, x: 4, y: 4 },
  { player: Player.WHITE, x: 2, y: 2 },
], BoardSize.SMALL);

// Ready for scoring
const scoring = GameStateFactory.readyForScoring(BoardSize.SMALL);

// Finished game
const finished = GameStateFactory.finished(Player.BLACK, BoardSize.SMALL);
```

## Using Fixtures

```typescript
import {
  SimplePatterns,
  CapturePatterns,
  KoPatterns,
  TerritoryPatterns,
  GameStates,
  MoveSequences,
} from './test-utils/fixtures';

// Use predefined board patterns
const centerStone = SimplePatterns.centerStone;
const captureSetup = CapturePatterns.simpleCapture;
const koSituation = KoPatterns.basicKo;

// Use predefined game states
const earlyGame = GameStates.earlyGame;
const scoringPhase = GameStates.scoring;

// Use predefined move sequences
const opening = MoveSequences.opening;
const captureSeq = MoveSequences.captureSequence;
```

## Visual Debugging

```typescript
import { BoardDebugger, AsciiBoardParser } from './test-utils/board-helpers';

// Print board to console
BoardDebugger.print(board, 'Test Board');

// Print board differences
BoardDebugger.printDiff(board1, board2, 'Before vs After');

// Highlight specific positions
const highlighted = BoardDebugger.highlightPositions(board, positions, '*');
console.log(highlighted);

// Convert board to ASCII string
const asciiString = AsciiBoardParser.stringify(board, {
  showCoordinates: true,
  blackSymbol: '●',
  whiteSymbol: '○',
  emptySymbol: '·',
});
```

## Quick Test Setups

```typescript
import { TestSetup } from './test-utils';

// Basic game
const basicGame = TestSetup.basicGame(BoardSize.SMALL);

// Capture scenario
const captureGame = TestSetup.captureGame();

// Ko rule scenario
const koGame = TestSetup.koGame();

// Scoring phase
const scoringGame = TestSetup.scoringGame();
```

## Mock Data Generation

```typescript
import { MockDataGenerator, BoardSize } from './test-utils';

// Realistic game moves
const moves = MockDataGenerator.realisticGameMoves(BoardSize.SMALL);

// Capture scenario
const captureScenario = MockDataGenerator.captureScenario(BoardSize.SMALL);

// Ko situation
const koSituation = MockDataGenerator.koSituation();
```

## Board Analysis

```typescript
import { BoardAnalyzer } from './test-utils/board-helpers';

// Count stones
const counts = BoardAnalyzer.countStones(board);
console.log(`Black: ${counts.black}, White: ${counts.white}`);

// Find empty positions
const empty = BoardAnalyzer.findEmptyPositions(board);

// Find player stones
const blackStones = BoardAnalyzer.findPlayerStones(board, Player.BLACK);

// Compare boards
const areEqual = BoardAnalyzer.boardsEqual(board1, board2);

// Get symmetries
const symmetries = BoardAnalyzer.getSymmetries(board);
```

## Test Examples

See `example.test.ts` for comprehensive examples of how to use all these utilities in actual tests.

## Best Practices

1. **Use Builders** - Prefer fluent API builders over manual board construction
2. **Use Fixtures** - Reuse common patterns from fixtures rather than recreating
3. **Visual Debugging** - Use ASCII representation for debugging failing tests
4. **Custom Matchers** - Use Go-specific matchers for clearer test assertions
5. **Mock Data** - Use generators for realistic test scenarios
6. **Test Organization** - Group related tests using the provided setup helpers

## Performance Testing

```typescript
import { PerformanceTestData } from './test-utils/fixtures';

// Large number of moves for stress testing
const manyMoves = PerformanceTestData.manyMoves;

// Complex board state
const complexBoard = PerformanceTestData.complexBoard;

// Measure performance
const startTime = performance.now();
// ... run test ...
const endTime = performance.now();
console.log(`Test took ${endTime - startTime} milliseconds`);
```

## Error Testing

```typescript
import { ErrorScenarios } from './test-utils/fixtures';

// Test occupied position error
const scenario = ErrorScenarios.occupiedPosition;
const result = engine.makeMove(scenario.move.player, MoveType.PLACE_STONE, scenario.move);
expect(result.error).toContain(scenario.expectedError);
```

## Contributing

When adding new test utilities:

1. Keep them focused and single-purpose
2. Provide clear documentation and examples
3. Add them to the appropriate category (builders, generators, matchers, etc.)
4. Include them in the main index.ts export
5. Add usage examples to the example.test.ts file

## Files Structure

- `index.ts` - Main utilities and builders
- `fixtures.ts` - Pre-defined patterns and scenarios
- `board-helpers.ts` - ASCII parsing and board analysis
- `example.test.ts` - Usage examples and integration tests
- `README.md` - This documentation

This comprehensive test utility suite makes Go game testing efficient, readable, and maintainable.