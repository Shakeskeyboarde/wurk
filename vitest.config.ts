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
      include: ['packages/*/src/**/*.{ts,tsx}'],
      exclude: ['packages/_*', '**/exports.ts', '**/*.test.*', '**/*.d.ts'],
      // branches: 90,
      // functions: 80,
      // lines: 50,
      // statements: 50,
    },
  },
});
