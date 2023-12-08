import { relative } from 'node:path';

import { createCommand } from '@werk/cli';

import { build } from './build.js';

const startCallbacks: (() => Promise<any>)[] = [];
const updateRequired = new Set<string>();

export default createCommand({
  config: (commander) => {
    return commander
      .alias('start')
      .addHelpText(
        'after',
        'Auto detects and uses common tools and opinionated configurations for near-zero configuration.',
      )
      .option('-w, --watch', 'Continuously build on source code changes and start development servers.')
      .addOption(commander.createOption('-s, --start', 'Alias for the --watch option.').implies({ watch: true }))
      .option('--vite', 'Use Vite for all builds instead of auto-detecting.')
      .option('--no-clean', 'Do not clean the build directory before building.')
      .hook('preAction', (cmd) => {
        const commandName = cmd.parent!.args[0];

        if (commandName === 'start' && cmd.getOptionValue('watch') == null) {
          cmd.setOptionValue('watch', true);
        }
      });
  },

  before: async ({ opts, setPrintSummary }) => {
    setPrintSummary(!opts.watch);
  },

  each: async ({ opts, log, root, workspace, spawn }) => {
    const { watch = false, vite = false, clean } = opts;

    if (!workspace.isSelected) return;

    workspace.setStatus('pending');

    const isSuccess = await build({ log, workspace, root, watch: false, vite, clean, spawn });

    if (isSuccess) {
      const missing = await workspace.getMissingEntryPoints();

      if (missing.length) {
        workspace.setStatus('warning', 'entry points');
        log.warn(`Missing entry points:`);
        missing.forEach(({ type, filename }) => log.warn(`  - ${relative(workspace.dir, filename)} (${type})`));
      }

      if (watch) {
        startCallbacks.push(() => build({ log, workspace, root, watch: true, vite, clean: false, spawn }));
      }

      updateRequired.add(workspace.name);
    } else {
      process.exitCode ||= 1;
    }
  },

  after: async ({ spawn }) => {
    if (updateRequired.size) {
      await spawn('npm', ['update', ...updateRequired.keys()], { errorEcho: true, errorReturn: true });
    }

    await Promise.all(startCallbacks.map((callback) => callback()));
  },
});
