# AI Opponent Implementation Plan

## Overview
Implement a single-player mode where users can play against an AI opponent with varying difficulty levels.

## Implementation Phases

### Phase 1: Basic AI (Immediate Priority)
**Timeline**: 1 week
**Difficulty Levels**: Beginner (30k-20k)

#### Algorithm: Weighted Random with Basic Heuristics
```typescript
interface AIMove {
  position: Position;
  score: number;
}

class BasicGoAI {
  // Evaluate each legal move
  evaluateMove(position: Position, gameState: GameState): number {
    let score = Math.random() * 10; // Base randomness
    
    // Prefer captures (high priority)
    const captures = this.checkCaptures(position, gameState);
    score += captures * 50;
    
    // Avoid self-atari (being captured)
    const liberties = this.countLiberties(position, gameState);
    if (liberties === 1) score -= 100;
    if (liberties === 2) score -= 20;
    
    // Prefer moves with more liberties
    score += liberties * 5;
    
    // Prefer center and sides over corners early game
    if (gameState.moveCount < 20) {
      score += this.getPositionalValue(position, gameState.boardSize);
    }
    
    return score;
  }
  
  selectMove(gameState: GameState): Position {
    const legalMoves = this.getAllLegalMoves(gameState);
    const evaluatedMoves = legalMoves.map(pos => ({
      position: pos,
      score: this.evaluateMove(pos, gameState)
    }));
    
    // Sort by score and pick from top moves (with some randomness)
    evaluatedMoves.sort((a, b) => b.score - a.score);
    const topMoves = evaluatedMoves.slice(0, Math.min(5, evaluatedMoves.length));
    
    return topMoves[Math.floor(Math.random() * topMoves.length)].position;
  }
}
```

#### Features:
- **Capture Detection**: Prioritizes capturing opponent stones
- **Self-Preservation**: Avoids moves that lead to immediate capture
- **Liberty Counting**: Prefers moves with more liberties
- **Opening Preferences**: Basic positional play in early game
- **Response Time**: < 500ms per move

### Phase 2: Intermediate AI
**Timeline**: 1 week
**Difficulty Levels**: Intermediate (15k-10k)

#### Algorithm: Pattern Matching + Tactical Search
```typescript
class IntermediateGoAI extends BasicGoAI {
  private patterns: Pattern[] = [
    // Common patterns like ladder, net, snapback
  ];
  
  evaluateMove(position: Position, gameState: GameState): number {
    let score = super.evaluateMove(position, gameState);
    
    // Pattern matching
    score += this.matchPatterns(position, gameState) * 30;
    
    // Tactical search (1-3 moves ahead)
    score += this.tacticalSearch(position, gameState, 2) * 20;
    
    // Territory estimation
    score += this.estimateTerritory(position, gameState) * 10;
    
    // Connection/cutting moves
    score += this.evaluateConnections(position, gameState) * 15;
    
    return score;
  }
  
  private tacticalSearch(position: Position, gameState: GameState, depth: number): number {
    // Mini-max search for captures and escapes
    // Limited to local area (3x3 or 5x5 around the move)
  }
}
```

#### Features:
- **Pattern Library**: Common shapes and responses
- **Tactical Reading**: 2-3 moves lookahead for captures/escapes
- **Territory Estimation**: Basic influence calculation
- **Group Safety**: Evaluates eye-space and connections
- **Opening Book**: Common joseki patterns
- **Response Time**: < 1 second per move

### Phase 3: Advanced AI (Future)
**Timeline**: 2-3 weeks
**Difficulty Levels**: Advanced (5k-1d)

#### Algorithm Options:

##### Option A: Monte Carlo Tree Search (MCTS)
```typescript
class MCTSGoAI {
  private simulations = 1000; // Per move
  
  selectMove(gameState: GameState): Position {
    const root = new MCTSNode(gameState);
    
    for (let i = 0; i < this.simulations; i++) {
      let node = root;
      
      // Selection
      while (!node.isLeaf() && !node.isTerminal()) {
        node = node.selectChild(); // UCB1 formula
      }
      
      // Expansion
      if (!node.isTerminal()) {
        node = node.expand();
      }
      
      // Simulation
      const result = this.simulate(node.gameState);
      
      // Backpropagation
      node.backpropagate(result);
    }
    
    return root.getBestMove();
  }
}
```

##### Option B: KataGo WASM Integration
```typescript
class KataGoAI {
  private engine: KataGoWASM;
  
  async initialize() {
    this.engine = await loadKataGoWASM();
    await this.engine.loadNetwork('path/to/network.bin.gz');
  }
  
  async selectMove(gameState: GameState): Promise<Position> {
    const analysis = await this.engine.analyze(gameState, {
      maxVisits: 500,
      includePolicy: true,
      includeOwnership: true
    });
    
    return analysis.moves[0].position;
  }
}
```

## Integration Architecture

### 1. AI Service Structure
```typescript
// libs/game/src/lib/services/ai-service.ts
interface AIService {
  selectMove(gameState: GameState, difficulty: Difficulty): Promise<Position>;
  analyzePosition(gameState: GameState): Promise<Analysis>;
  suggestMove(gameState: GameState): Promise<Suggestion>;
}

enum Difficulty {
  BEGINNER = 'beginner',    // 30k-20k
  EASY = 'easy',            // 20k-15k
  MEDIUM = 'medium',        // 15k-10k
  HARD = 'hard',            // 10k-5k
  EXPERT = 'expert'         // 5k-1d
}
```

### 2. Web Worker Implementation
```typescript
// libs/game/src/lib/workers/ai-worker.ts
self.addEventListener('message', async (event) => {
  const { gameState, difficulty } = event.data;
  
  // Run AI calculation in background thread
  const ai = AIFactory.create(difficulty);
  const move = await ai.selectMove(gameState);
  
  self.postMessage({ move });
});
```

### 3. React Integration
```typescript
// libs/game/src/lib/components/SinglePlayerGame.tsx
export function SinglePlayerGame() {
  const [aiDifficulty, setAIDifficulty] = useState(Difficulty.BEGINNER);
  const [aiThinking, setAIThinking] = useState(false);
  
  const handlePlayerMove = async (position: Position) => {
    // Process player move
    makeMove(position);
    
    // AI responds
    setAIThinking(true);
    const aiMove = await aiService.selectMove(gameState, aiDifficulty);
    makeMove(aiMove);
    setAIThinking(false);
  };
  
  return (
    <>
      <DifficultySelector value={aiDifficulty} onChange={setAIDifficulty} />
      <GoBoard onMove={handlePlayerMove} />
      {aiThinking && <Loader label="AI is thinking..." />}
    </>
  );
}
```

## UI/UX Considerations

### AI Difficulty Selection
```typescript
<Select
  label="AI Difficulty"
  data={[
    { value: 'beginner', label: 'Beginner (30k)' },
    { value: 'easy', label: 'Easy (20k)' },
    { value: 'medium', label: 'Medium (10k)' },
    { value: 'hard', label: 'Hard (5k)' },
    { value: 'expert', label: 'Expert (1d)' }
  ]}
/>
```

### AI Thinking Indicator
- Show spinner/loader when AI is calculating
- Display "AI is thinking..." message
- Optional: Show progress bar for longer calculations
- Allow move cancellation if AI takes too long

### AI Personality Options (Future)
```typescript
interface AIPersonality {
  name: string;
  style: 'aggressive' | 'defensive' | 'balanced' | 'territorial';
  avatar: string;
  greeting: string;
  moveComments: boolean;
}
```

## Performance Optimization

### 1. Move Caching
```typescript
class AICache {
  private cache = new Map<string, Position>();
  
  getCachedMove(boardHash: string): Position | null {
    return this.cache.get(boardHash) || null;
  }
  
  cacheMove(boardHash: string, move: Position) {
    if (this.cache.size > 1000) {
      // LRU eviction
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(boardHash, move);
  }
}
```

### 2. Progressive Difficulty
- Start with faster, simpler evaluation
- Increase complexity based on time available
- Ensure consistent response time (1-3 seconds max)

### 3. Opening Book
```typescript
const OPENING_BOOK = {
  '19x19': [
    { move: 1, positions: [[3,3], [15,15], [3,15], [15,3]] }, // Corners
    { move: 2, positions: [[16,3], [3,16], [15,3], [3,15]] }, // Approaches
  ],
  '13x13': [
    { move: 1, positions: [[3,3], [9,9], [3,9], [9,3]] },
  ],
  '9x9': [
    { move: 1, positions: [[2,2], [6,6], [2,6], [6,2]] },
  ]
};
```

## Testing Strategy

### 1. Unit Tests
```typescript
describe('BasicGoAI', () => {
  it('should prefer capturing moves', () => {
    const gameState = setupCaptureScenario();
    const move = ai.selectMove(gameState);
    expect(move).toEqual(expectedCaptureMove);
  });
  
  it('should avoid self-atari', () => {
    const gameState = setupSelfAtariScenario();
    const move = ai.selectMove(gameState);
    expect(move).not.toEqual(selfAtariMove);
  });
});
```

### 2. Strength Testing
- Play AI vs AI at different levels
- Ensure proper strength progression
- Validate win rates: Beginner < Easy < Medium < Hard

### 3. Performance Testing
- Measure move generation time
- Ensure < 3 second response on all devices
- Test with various board sizes

## Deployment Plan

### Week 1: Basic AI
- [ ] Implement BasicGoAI class
- [ ] Add difficulty selector UI
- [ ] Create SinglePlayerGame component
- [ ] Integrate with existing game engine
- [ ] Add AI vs AI testing mode

### Week 2: Intermediate AI & Polish
- [ ] Implement pattern matching
- [ ] Add tactical search
- [ ] Create opening book
- [ ] Improve UI with thinking indicators
- [ ] Add AI statistics tracking

### Future: Advanced AI
- [ ] Research MCTS implementation
- [ ] Evaluate KataGo WASM feasibility
- [ ] Implement chosen approach
- [ ] Add analysis features
- [ ] Create teaching mode

## Success Metrics

### Performance
- Move generation: < 1s (basic), < 2s (intermediate), < 3s (advanced)
- Memory usage: < 50MB for AI calculations
- Battery impact: Minimal on mobile devices

### User Experience
- Win rate vs Beginner AI: 70-90% for casual players
- Win rate vs Medium AI: 30-50% for casual players
- Win rate vs Expert AI: < 10% for casual players
- User satisfaction: 4+ star rating for AI gameplay

### Technical
- Test coverage: > 80% for AI code
- No blocking of UI thread
- Consistent behavior across devices