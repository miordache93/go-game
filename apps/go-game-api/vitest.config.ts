/// <reference types="vitest" />
import { defineConfig } from 'vite';
import * as path from 'path';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/go-game-api',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@go-game/shared': path.resolve(__dirname, '../../libs/shared/src'),
    },
  },
  // Vitest configuration for API testing with Node.js
  test: {
    name: '@go-game/go-game-api',
    root: __dirname,
    environment: 'node', // Node environment for API testing
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: [
      'node_modules/**',
      'dist/**',
      '**/*.d.ts',
      'coverage/**',
      'e2e/**',
    ],
    globals: false, // Explicit imports for better tree-shaking
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: '../../coverage/apps/go-game-api',
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        'src/main.ts', // Entry point
        '**/*.test.*',
        '**/*.spec.*',
        'src/test-setup.ts',
        'src/test-helpers/**',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Single fork for database tests to avoid conflicts
      },
    },
    // API testing configuration
    testTimeout: 15000, // 15s timeout for API tests including DB operations
    retry: 1,
    // Sequentially run tests to avoid database conflicts
    sequence: {
      concurrent: false,
    },
  },
}));