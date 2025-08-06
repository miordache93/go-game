import { ThemeProvider } from '@go-game/ui';
import { Game, MultiplayerGame } from '@go-game/game';
import { useState } from 'react';
import { Button, Group, Container } from '@mantine/core';

/**
 * Main GO Game Application
 */
export function App() {
  const [mode, setMode] = useState<'local' | 'multiplayer'>('local');

  return (
    <ThemeProvider>
      {mode === 'local' ? (
        <>
          <Container size="xl" mt="md">
            <Group justify="center" mb="md">
              <Button onClick={() => setMode('multiplayer')}>
                Switch to Multiplayer
              </Button>
            </Group>
          </Container>
          <Game />
        </>
      ) : (
        <>
          <Container size="xl" mt="md">
            <Group justify="center" mb="md">
              <Button onClick={() => setMode('local')}>
                Switch to Local Play
              </Button>
            </Group>
          </Container>
          <MultiplayerGame onBack={() => setMode('local')} />
        </>
      )}
    </ThemeProvider>
  );
}

export default App;
