import { createCommand, type Workspace } from 'wurk';

import { type BuilderFactory } from './builder.js';
import { getRollupBuilder } from './builders/rollup.js';
import { getScriptBuilder } from './builders/script.js';
import { getTscBuilder } from './builders/tsc.js';
import { getViteBuilder } from './builders/vite.js';

const BUILDER_FACTORIES = [
  getScriptBuilder,
  getViteBuilder,
  getRollupBuilder,
  getTscBuilder,
] as const satisfies readonly BuilderFactory[];

export default createCommand('build', {
  config: (cli) => {
    return cli
      .alias('start')
      .trailer(
        'Auto detects and uses common tools and opinionated configurations for near-zero configuration.',
      )
      .option(
        '--start',
        'continuously build on source code changes and start development servers',
      )
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

    autoPrintStatus();

    const builders = new Map<
      Workspace,
      {
        build: (() => Promise<void>) | null;
        start: (() => Promise<void>) | null;
      }
    >();

    await workspaces.forEach(async (workspace) => {
      let build: (() => Promise<void>) | null = null;
      let start: (() => Promise<void>) | null = null;

      for (const factory of BUILDER_FACTORIES) {
        const builder = await factory(workspace);

        if (!builder) continue;

        build = build ?? builder.build;
        start = start ?? builder.start;

        if (build && start) break;
      }

      if (build || start) {
        builders.set(workspace, { build, start });
      } else {
        workspace.isSelected = false;
      }

      if (!build) {
        workspace.status.set('skipped', 'no builder');
      }
    });

    if (builders.size === 0) return;

    if (options.clean) {
      await workspaces.forEachSequential(async (workspace) => {
        await workspace.clean();
      });
    }

    await workspaces.forEach(async (workspace) => {
      await builders.get(workspace)?.build?.();
    });

    const updateNames = Array.from(builders.entries())
      .filter(([, builder]) => builder.build)
      .map(([ws]) => ws.name);

    if (updateNames.length) {
      await workspaces.root.spawn('npm', ['update', ...updateNames], {
        output: 'ignore',
      });
    }

    if (options.start) {
      // Don't show the status summary after starting.
      autoPrintStatus(false);

      await workspaces.forEachIndependent(async (workspace) => {
        await builders.get(workspace)?.start?.();
      });
    }
  },
});
