/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    // Workspace configuration
    projects: [
      'libs/game/vitest.config.ts',
      'libs/shared/vitest.config.ts',
      'libs/ui/vitest.config.ts',
      'apps/go-game/vitest.config.ts',
      'apps/go-game-api/vitest.config.ts',
      'apps/go-game-partykit/vitest.config.ts',
    ],
    globals: false,
  },
});