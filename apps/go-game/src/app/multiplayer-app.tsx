import { ThemeProvider } from '@go-game/ui';
import { MultiplayerGame } from '@go-game/game';

export function MultiplayerApp() {
  return (
    <ThemeProvider>
      <MultiplayerGame />
    </ThemeProvider>
  );
}

export default MultiplayerApp;