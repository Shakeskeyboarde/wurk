import assert from 'node:assert';
import { relative } from 'node:path';

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
    const { log, opts, workspace } = options;
    const { start = false } = opts;

    if (!workspace.selected) return;

    await build({ ...options, start: false });

    const missing = await workspace.getMissingEntryPoints();
    const missingMessage =
      missing.length === 0
        ? undefined
        : `Workspace "${workspace.name}" is missing the following entry points:${missing.reduce(
            (result, { type, filename }) => `${result}\n  - ${relative(workspace.dir, filename)} (${type})`,
            '',
          )}`;

    if (start) {
      startCallbacks.push(() => build({ ...options, start: true }));

      if (missingMessage) log.warn(missingMessage);
    } else {
      assert(!missingMessage, missingMessage);
    }
  },

  after: async () => {
    await Promise.all(startCallbacks.map((callback) => callback()));
  },
});
