import { createCommand, type Workspace } from 'wurk';

import { check } from './check.js';
import { getBuilder } from './get-builder.js';

const command = createCommand('build', {
  config: (cli) => {
    return cli
      .alias('start')
      .trailer('Auto detects and uses common tools and opinionated configurations for near-zero configuration.')
      .option('--start', 'continuously build on source code changes and start development servers')
      .option('--clean', { hidden: true })
      .option('--no-clean', 'do not clean the build directory before building')
      .optionNegation('clean', 'noClean')
      .action(async ({ name, options }) => {
        if (name === 'start') {
          options.start = true;
        }
      });
  },

  run: async (context) => {
    const { options, workspaces, autoPrintStatus } = context;
    const { clean = true, start = false } = options;

    autoPrintStatus();

    const builders = new Map<Workspace, (mode: 'build' | 'start') => Promise<void>>();

    await workspaces.forEach(async (workspace) => {
      const builder = await getBuilder({ workspace, root: workspaces.root });

      if (builder) {
        builders.set(workspace, builder);
      } else {
        workspace.isSelected = false;
      }
    });

    if (builders.size === 0) return;

    if (clean) {
      await workspaces.forEachSequential(async (workspace) => {
        await workspace.clean();
      });
    }

    await workspaces.forEach(async (workspace) => {
      await builders.get(workspace)!('build');
      await check(workspace);
    });

    await workspaces.root.spawn('npm', ['update', ...Array.from(builders.keys()).map((ws) => ws.name)], {
      output: 'ignore',
    });

    if (start) {
      // Don't show the status summary after starting.
      autoPrintStatus(false);

      await workspaces.forEachIndependent(async (workspace) => {
        await builders.get(workspace)?.('start');
      });
    }
  },
});

export default command;
