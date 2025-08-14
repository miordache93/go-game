/// <reference types="vitest" />
import { defineConfig } from 'vite';
import * as path from 'path';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/go-game-partykit',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@go-game/shared': path.resolve(__dirname, '../../libs/shared/src'),
    },
  },
  // Vitest configuration for PartyKit server testing
  test: {
    name: '@go-game/go-game-partykit',
    root: __dirname,
    environment: 'node', // Node environment with WebSocket support
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: [
      'node_modules/**',
      'dist/**',
      '**/*.d.ts',
      'coverage/**',
      '.partykit/**',
    ],
    globals: false, // Explicit imports for better tree-shaking
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: '../../coverage/apps/go-game-partykit',
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        'src/server.ts', // Entry point
        '**/*.test.*',
        '**/*.spec.*',
        'src/test-setup.ts',
        '.partykit/**',
      ],
      thresholds: {
        global: {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75,
        },
      },
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Single fork for WebSocket tests to avoid port conflicts
      },
    },
    // WebSocket and real-time testing configuration
    testTimeout: 20000, // 20s timeout for WebSocket connection tests
    retry: 2,
    // Sequential execution to avoid WebSocket port conflicts
    sequence: {
      concurrent: false,
    },
  },
}));