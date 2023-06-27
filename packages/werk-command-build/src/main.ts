import { createCommand } from '@werk/cli';

import { build } from './build.js';

const startCallbacks: (() => Promise<any>)[] = [];

export default createCommand({
  packageManager: ['npm'],

  init: ({ commander }) => {
    return commander.option('-s, --start', '');
  },

  before: async ({ forceWait }) => {
    forceWait();
  },

  each: async (options) => {
    const { opts, workspace } = options;
    const { start = false } = opts;

    if (!workspace.selected) return;

    await build({ ...options, start: false });

    if (start) {
      startCallbacks.push(async () => {
        await build({ ...options, start: true });
      });
    }
  },

  after: async () => {
    await Promise.all(startCallbacks.map((callback) => callback()));
  },
});
