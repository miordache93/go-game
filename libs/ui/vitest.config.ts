/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import * as path from 'path';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/libs/ui',
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
    name: '@go-game/ui',
    fileName: 'index',
    formats: ['es' as const],
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    lib: {
      entry: 'src/index.ts',
      name: '@go-game/ui',
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
  // Vitest configuration for UI components testing
  test: {
    name: '@go-game/ui',
    root: __dirname,
    environment: 'happy-dom', // Happy DOM for better performance than JSDOM
    include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: [
      'node_modules/**',
      'dist/**',
      '**/*.d.ts',
      'coverage/**',
    ],
    globals: true, // Required for @testing-library/jest-dom
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: '../../coverage/libs/ui',
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts', // Barrel exports
        '**/*.stories.*',
        '**/*.test.*',
        '**/*.spec.*',
        'src/test-setup.ts',
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
        singleFork: false,
      },
    },
  },
}));