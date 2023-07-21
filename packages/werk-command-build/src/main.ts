import assert from 'node:assert';

import { createCommand } from '@werk/cli';

import { build } from './build.js';

const startCallbacks: (() => Promise<any>)[] = [];

export default createCommand({
  init: ({ commander }) => {
    return commander.option('-s, --start', 'Continuously build changed workspaces and start development servers.');
  },

  before: async ({ forceWait }) => {
    forceWait();
  },

  each: async (options) => {
    const { opts, workspace } = options;
    const { start = false } = opts;

    if (!workspace.selected) return;

    await build({ ...options, start: false });

    assert(await workspace.getIsBuilt(), `Workspace "${workspace.name}" is missing entry points after building.`);

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
