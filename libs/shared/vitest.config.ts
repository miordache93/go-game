/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import * as path from 'path';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/libs/shared',
  plugins: [
    react(),
    dts({
      entryRoot: 'src',
      tsconfigPath: path.join(__dirname, 'tsconfig.lib.json'),
    }),
    dts({
      entryRoot: 'src',
      tsconfigPath: path.join(__dirname, 'tsconfig.lib.json'),
    }),
  ],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [ nxViteTsPaths() ],
  // },
  // Configuration for building your library.
  // See: https://vitejs.dev/guide/build.html#library-mode
  build: {
    emptyOutDir: true,
    transformMixedEsModules: true,
    entry: 'src/index.ts',
    name: '@go-game/shared',
    fileName: 'index',
    formats: ['es' as const],
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    lib: {
      entry: 'src/index.ts',
      name: '@go-game/shared',
      fileName: 'index',
      formats: ['es' as const],
    },
    rollupOptions: {
      external: ["'react'", "'react-dom'", "'react/jsx-runtime'"],
    },
    outDir: './dist',
    reportCompressedSize: true,
    commonjsOptions: { transformMixedEsModules: true },
  },
  // Vitest configuration for shared utilities testing
  test: {
    name: '@go-game/shared',
    root: __dirname,
    environment: 'node', // Node environment for utilities
    include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: [
      'node_modules/**',
      'dist/**',
      '**/*.d.ts',
      'coverage/**',
    ],
    globals: false, // Explicit imports for better tree-shaking
    setupFiles: [],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: '../../coverage/libs/shared',
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts', // Barrel exports
        '**/*.stories.*',
        '**/*.test.*',
        '**/*.spec.*',
      ],
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },
  },
}));