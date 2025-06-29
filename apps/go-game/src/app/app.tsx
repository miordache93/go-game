import { ThemeProvider } from '@go-game/ui';
import { Game } from '@go-game/game';

/**
 * Main GO Game Application
 */
export function App() {
  return (
    <ThemeProvider>
      <Game />
    </ThemeProvider>
  );
}

export default App;
