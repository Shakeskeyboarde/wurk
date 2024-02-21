import { EventEmitter } from 'node:events';

import { defineConfig } from 'vitest/config';

EventEmitter.defaultMaxListeners = 20;

export default defineConfig({
  test: {
    passWithNoTests: true,
    reporters: ['verbose'],
    restoreMocks: true,
    coverage: {
      enabled: true,
      all: true,
      reportsDirectory: './out/coverage',
      include: ['**/*.{ts,tsx}'],
      exclude: ['**/{_*,.git*,.vscode,out,lib,dist,index*,example*,*.d.ts,types.ts}', '*.*'],
      thresholds: {
        global: {
          branches: 0,
          functions: 0,
          lines: 0,
          statements: 0,
        },
        '**/core/cli/src/**': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
  },
});
