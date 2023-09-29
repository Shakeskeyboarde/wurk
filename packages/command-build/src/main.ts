import { relative } from 'node:path';

import { createCommand } from '@werk/cli';

import { build } from './build.js';

const startCallbacks: (() => Promise<boolean | null>)[] = [];
const updateRequired = new Set<string>();

let isAborted = false;

export default createCommand({
  config: (commander) => {
    return commander
      .addHelpText(
        'after',
        'Auto detects and uses common tools and opinionated configurations for near-zero configuration.',
      )
      .option('-w, --watch', 'Continuously build on source code changes and start development servers.')
      .addOption(commander.createOption('-s, --start', 'Alias for the --watch option.').implies({ watch: true }))
      .option('--vite', 'Use Vite for all builds instead of auto-detecting.')
      .option('--abort-on-failure', 'Abort on the first build failure.');
  },

  each: async ({ opts, log, root, workspace, spawn }) => {
    if (isAborted) return;

    const { watch = false, vite = false, abortOnFailure = false } = opts;

    if (!workspace.isSelected) return;

    const isBuilt = await build({ log, workspace, root, watch: false, vite, spawn });

    if (isBuilt) {
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
    } else if (isBuilt != null && abortOnFailure) {
      isAborted = true;
    }

    if (watch) {
      startCallbacks.push(() => build({ log, workspace, root, watch: true, vite, spawn }));
    }
  },

  after: async ({ spawn }) => {
    if (updateRequired.size) {
      await spawn('npm', ['update', ...updateRequired.keys()], { errorEcho: true, errorReturn: true });
    }

    await Promise.all(startCallbacks.map((callback) => callback()));
  },
});
