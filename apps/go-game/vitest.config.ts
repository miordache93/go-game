/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/go-game',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@go-game/game': path.resolve(__dirname, '../../libs/game/src'),
      '@go-game/shared': path.resolve(__dirname, '../../libs/shared/src'),
      '@go-game/ui': path.resolve(__dirname, '../../libs/ui/src'),
    },
  },
  // Vitest configuration for React component testing
  test: {
    name: '@go-game/go-game',
    root: __dirname,
    environment: 'happy-dom', // Happy DOM for better performance
    include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: [
      'node_modules/**',
      'dist/**',
      '**/*.d.ts',
      'coverage/**',
      'e2e/**',
    ],
    globals: true, // Required for @testing-library/jest-dom
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8' as const,
      reporter: ['text', 'json', 'html'],
      reportsDirectory: '../../coverage/apps/go-game',
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        'src/main.tsx', // Entry point
        'src/vite-env.d.ts',
        '**/*.stories.*',
        '**/*.test.*',
        '**/*.spec.*',
        'src/test-setup.ts',
        'public/**',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },
    // React Testing Library configuration
    testTimeout: 10000, // 10s timeout for component tests
    retry: 2,
  },
}));