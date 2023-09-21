import { relative } from 'node:path';

import { createCommand } from '@werk/cli';

import { build } from './build.js';

const startCallbacks: (() => Promise<any>)[] = [];
const updateRequired = new Set<string>();

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

    if (missing.length) {
      log.warn(
        `Workspace "${workspace.name}" is missing the following entry points:${missing.reduce(
          (result, { type, filename }) => `${result}\n  - ${relative(workspace.dir, filename)} (${type})`,
          '',
        )}`,
      );
    }

    updateRequired.add(workspace.name);

    if (start) {
      startCallbacks.push(() => build({ ...options, start: true }));
      return;
    }
  },

  after: async ({ spawn }) => {
    if (updateRequired.size) {
      await spawn('npm', ['update', ...updateRequired.keys()], { errorEcho: true, errorReturn: true });
    }

    await Promise.all(startCallbacks.map((callback) => callback()));
  },
});
