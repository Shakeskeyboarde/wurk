import assert from 'node:assert';

import { createCommand } from '@werk/cli';

import { build } from './build.js';

const startCallbacks: (() => Promise<any>)[] = [];

export default createCommand({
  config: (commander) => {
    return commander
      .addHelpText(
        'after',
        'Auto detects and uses common tools and opinionated configurations for near-zero configuration.',
      )
      .option('-s, --start', 'Continuously build on source code changes and start development servers.')
      .addOption(commander.createOption('-w, --watch', 'Alias for the --start option.').implies({ start: true }));
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
      startCallbacks.push(() => build({ ...options, start: true }));
    }
  },

  after: async () => {
    await Promise.all(startCallbacks.map((callback) => callback()));
  },
});

export { loadViteOptionalPlugins } from './build-vite.js';
