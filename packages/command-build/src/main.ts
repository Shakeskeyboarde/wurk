import { chmod, readFile, stat, writeFile } from 'node:fs/promises';
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

    if (start) {
      startCallbacks.push(() => build({ ...options, start: true }));
      return;
    }

    updateRequired.add(workspace.name);

    const entryPoints = workspace.getEntryPoints();
    const bins = entryPoints.flatMap(({ type, filename }) => {
      if (type !== 'bin' || !/\.[cm]?js$/u.test(filename)) return [];
      return [filename];
    });

    await Promise.all(
      bins.map(async (bin) => {
        const [stats, content] = await Promise.all([
          stat(bin).catch(() => undefined),
          readFile(bin, 'utf8').catch(() => undefined),
        ]);

        if (stats) await chmod(bin, 0o111 | stats.mode);
        if (content && !content.startsWith('#!')) await writeFile(bin, `#!/usr/bin/env node\n${content}`);
      }),
    );
  },

  after: async ({ spawn }) => {
    if (updateRequired.size) {
      await spawn('npm', ['update', ...updateRequired.keys()], { errorEcho: true });
    }

    await Promise.all(startCallbacks.map((callback) => callback()));
  },
});
