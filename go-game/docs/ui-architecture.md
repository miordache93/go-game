# GO Game UI Architecture

## 🏗️ Tech Stack Decision

```json
{
  "ui-framework": "mantine",
  "board-rendering": "konva + react-konva", 
  "animations": "framer-motion",
  "board-animations": "konva",
  "gestures": "@use-gesture/react",
  "icons": "@tabler/icons-react", 
  "styling": "mantine-styles",
  "theme": "mantine-theming"
}
```

## 📁 NX Monorepo Structure

```
go-game/
├── apps/
│   ├── web-app/                 # Main React app
│   ├── mobile-app/              # Capacitor wrapper (future)
│   └── storybook/               # Component documentation
├── libs/
│   ├── shared/
│   │   ├── ui-components/       # Reusable UI components
│   │   ├── theme/               # Mantine theme configuration
│   │   ├── types/               # TypeScript definitions
│   │   ├── utils/               # Utility functions
│   │   └── constants/           # App constants
│   ├── game/
│   │   ├── engine/              # Core game logic
│   │   ├── board/               # Board rendering & interactions
│   │   ├── scoring/             # Scoring algorithms
│   │   └── analysis/            # Game analysis features
│   ├── features/
│   │   ├── authentication/      # Login/register
│   │   ├── game-lobby/          # Game creation/joining
│   │   ├── live-game/           # Real-time gameplay
│   │   ├── game-history/        # Past games & replays
│   │   ├── user-profile/        # User management
│   │   ├── rankings/            # Leaderboards & stats
│   │   └── settings/            # App configuration
│   └── data/
│       ├── api/                 # API client & endpoints
│       ├── socket/              # Socket.io client
│       └── storage/             # Local storage utilities
├── tools/
│   ├── eslint/                  # Custom ESLint rules
│   └── generators/              # Custom NX generators
└── docs/
    ├── ui-architecture.md       # This file
    └── component-library.md     # Component documentation
```

## 🎨 Shared Libraries Architecture

### 1. Theme Library (`libs/shared/theme`)

```typescript
// libs/shared/theme/src/index.ts
import { MantineProvider, createTheme } from '@mantine/core';

export const goGameTheme = createTheme({
  colorScheme: 'dark',
  colors: {
    // GO-specific color palette
    board: ['#F5E6D3', '#DEB887', '#CD853F', '#A0522D', '#8B4513', '#654321', '#4A2C14', '#3D1E0F', '#2F140A', '#1F0D06'],
    stone: ['#FFFFFF', '#F5F5F5', '#E5E5E5', '#D0D0D0', '#B0B0B0', '#808080', '#404040', '#202020', '#101010', '#000000'],
    territory: ['#E8F5E8', '#D4F4D4', '#B8E6B8', '#9AD89A', '#7BC97B', '#5CB85C', '#4A9A4A', '#387838', '#265626', '#143414']
  },
  components: {
    Button: {
      styles: {
        root: {
          fontWeight: 500,
          borderRadius: '8px'
        }
      }
    }
  }
});

export const themePresets = {
  classic: { boardColor: 'board.1', primaryColor: 'brown' },
  modern: { boardColor: 'dark.7', primaryColor: 'blue' },
  zen: { boardColor: 'board.5', primaryColor: 'green' }
};
```

### 2. UI Components Library (`libs/shared/ui-components`)

```typescript
// Component structure
export {
  // Layout Components
  GameLayout,
  SplitLayout,
  
  // Game-specific Components  
  PlayerInfo,
  GameControls,
  MoveHistory,
  CaptureCounter,
  TimeDisplay,
  
  // Common UI
  LoadingSpinner,
  ErrorBoundary,
  ConfirmDialog,
  NotificationCenter
} from './components';
```

### 3. Game Engine Library (`libs/game/engine`)

```typescript
// Pure game logic - no UI dependencies
export class GameEngine {
  constructor(boardSize: 9 | 13 | 19) {}
  
  makeMove(position: Position): MoveResult;
  isValidMove(position: Position): boolean;
  getCapturedStones(position: Position): Position[];
  checkKoRule(position: Position): boolean;
  calculateScore(): ScoreResult;
}

export class GameState {
  board: Board;
  currentPlayer: Player;
  moveHistory: Move[];
  capturedStones: CapturedStones;
  gamePhase: GamePhase;
}
```

### 4. Board Library (`libs/game/board`)

```typescript
// Konva-based board rendering
export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  onStonePlace,
  onBoardInteraction,
  theme,
  zoom,
  pan
}) => {
  // Konva Stage with layers:
  // - Background layer
  // - Grid layer  
  // - Stone layer
  // - Marker layer (last move, territory)
  // - UI overlay layer
};

export const useBoardGestures = () => {
  // @use-gesture/react integration
  // Handles: tap, pinch, drag, double-tap
};

export const useBoardAnimations = () => {
  // Konva animation utilities
  // Stone placement, capture, territory marking
};
```

## 🚀 Feature Library Generation Strategy

### NX Generation Commands

```bash
# Generate feature libraries
npx nx g @nx/react:library authentication --directory=libs/features
npx nx g @nx/react:library game-lobby --directory=libs/features  
npx nx g @nx/react:library live-game --directory=libs/features
npx nx g @nx/react:library game-history --directory=libs/features
npx nx g @nx/react:library user-profile --directory=libs/features
npx nx g @nx/react:library rankings --directory=libs/features
npx nx g @nx/react:library settings --directory=libs/features

# Generate shared libraries
npx nx g @nx/react:library ui-components --directory=libs/shared
npx nx g @nx/react:library theme --directory=libs/shared
npx nx g @nx/js:library types --directory=libs/shared
npx nx g @nx/js:library utils --directory=libs/shared

# Generate game libraries  
npx nx g @nx/js:library engine --directory=libs/game
npx nx g @nx/react:library board --directory=libs/game
npx nx g @nx/js:library scoring --directory=libs/game
```

### Feature Library Structure Template

```typescript
// libs/features/live-game/src/index.ts
export { LiveGameProvider } from './providers/LiveGameProvider';
export { LiveGamePage } from './pages/LiveGamePage';
export { useLiveGame } from './hooks/useLiveGame';
export { liveGameApi } from './api/liveGameApi';

// Each feature is self-contained with:
// - Components
// - Hooks  
// - API layer
// - State management
// - Types
```

## 🔧 Development Workflow

### 1. Component Development

```bash
# Develop components in isolation
npx nx storybook shared-ui-components

# Test components
npx nx test shared-ui-components

# Build component library
npx nx build shared-ui-components
```

### 2. Feature Development

```bash
# Generate new feature
npx nx g @nx/react:library new-feature --directory=libs/features

# Develop feature with hot reload
npx nx serve web-app --with-deps

# Test feature integration
npx nx e2e web-app-e2e
```

### 3. Dependency Management

```typescript
// libs/features/live-game/project.json
{
  "implicitDependencies": [
    "shared-ui-components",
    "shared-theme", 
    "game-engine",
    "game-board"
  ]
}
```

## 🎮 Main App Integration

### App Shell Structure

```typescript
// apps/web-app/src/App.tsx
import { MantineProvider } from '@mantine/core';
import { goGameTheme } from '@go-game/shared/theme';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';

// Feature imports
import { AuthenticationProvider } from '@go-game/features/authentication';
import { GameLobbyPage } from '@go-game/features/game-lobby';
import { LiveGamePage } from '@go-game/features/live-game';

export default function App() {
  return (
    <MantineProvider theme={goGameTheme}>
      <BrowserRouter>
        <AuthenticationProvider>
          <AppShell>
            <Routes>
              <Route path="/lobby" element={<GameLobbyPage />} />
              <Route path="/game/:id" element={<LiveGamePage />} />
              {/* Other routes */}
            </Routes>
          </AppShell>
        </AuthenticationProvider>
      </BrowserRouter>
    </MantineProvider>
  );
}
```

### Feature Composition

```typescript
// Features compose together cleanly
const LiveGamePage = () => {
  const { gameState } = useLiveGame();
  const boardProps = useBoardGestures();
  
  return (
    <GameLayout>
      <GameBoard 
        gameState={gameState}
        {...boardProps}
      />
      <GameControls />
      <MoveHistory />
    </GameLayout>
  );
};
```

## 📊 Build & Bundle Strategy

### Webpack/Rspack Configuration

```typescript
// apps/web-app/rspack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Vendor libraries
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        // Game engine (heavy logic)
        gameEngine: {
          test: /[\\/]libs[\\/]game[\\/]/,
          name: 'game-engine',
          chunks: 'all',
        },
        // UI components
        uiComponents: {
          test: /[\\/]libs[\\/]shared[\\/]ui-components[\\/]/,
          name: 'ui-components', 
          chunks: 'all',
        }
      }
    }
  }
};
```

## 🧪 Testing Strategy

### Library Testing

```bash
# Unit tests for each library
npx nx test game-engine        # Pure logic testing
npx nx test game-board         # Konva component testing  
npx nx test shared-ui-components # Component testing

# Integration testing  
npx nx test features-live-game # Feature integration
```

### E2E Testing Structure

```typescript
// apps/web-app-e2e/src/integration/game-flow.cy.ts
describe('Full Game Flow', () => {
  it('should complete a full game', () => {
    cy.visit('/lobby');
    cy.findByText('Create Game').click();
    // Test uses all feature libraries together
  });
});
```

## 🚀 Deployment Strategy

### Build Targets

```bash
# Build all libraries
npx nx run-many -t build

# Build web app with dependencies
npx nx build web-app --with-deps

# Build mobile app  
npx nx build mobile-app --with-deps
```

### Library Publishing (Future)

```bash
# Publish shared libraries to npm
npx nx publish shared-ui-components
npx nx publish shared-theme
```

## 📈 Benefits of This Architecture

### 1. **Modularity**
- Each feature is independently developable
- Easy to add/remove features
- Clear separation of concerns

### 2. **Reusability** 
- UI components shared across features
- Game engine reusable for different UIs
- Theme system consistent everywhere

### 3. **Scalability**
- New features as new libraries
- Independent deployment possible
- Team can work on different features

### 4. **Maintainability**
- Clear dependency graph
- Easy to test in isolation
- Forced good architectural practices

### 5. **Performance**
- Bundle splitting by feature
- Lazy loading capabilities
- Tree shaking optimization

This architecture sets you up perfectly for the 22-week development plan while keeping the codebase maintainable and scalable! 🎯 