import nodeFs from 'node:fs';

import { createCommand, type Workspace } from 'wurk';

import { type Builder, type BuilderFactory } from './builder.js';
import { getRollupBuilder } from './builders/rollup.js';
import { getScriptBuilder } from './builders/script.js';
import { getTscBuilder } from './builders/tsc.js';
import { getViteBuilder } from './builders/vite.js';

const BUILDER_FACTORIES = [
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
      .option('--include-dependencies', { hidden: true })
      .option(
        '--no-include-dependencies',
        'do not automatically build the dependencies of selected workspaces',
      )
      .optionDefault('includeDependencies', true)
      .optionNegation('includeDependencies', 'noIncludeDependencies')
      .action(async ({ name, options }) => {
        if (name === 'start') {
          options.start = true;
        }
      });
  },

  action: async (context) => {
    const { options, workspaces, autoPrintStatus } = context;

    autoPrintStatus();

    const workspaceBuildTasks = new Map<Workspace, (() => Promise<void>)[]>();
    const workspaceStartTasks = new Map<Workspace, (() => Promise<void>)[]>();

    if (options.includeDependencies) {
      workspaces.includeDependencies();
    }

    await workspaces.forEach(async (workspace) => {
      const builders: (Builder | null)[] = [];
      const scriptBuilder = await getScriptBuilder(workspace);

      if (scriptBuilder) {
        // If the scripts builder is enabled, then it overrides all other
        // builders. Script building is intended as a way to bypass the
        // auto detection logic of this command.
        builders.push(scriptBuilder);
      } else {
        for (const factory of BUILDER_FACTORIES) {
          builders.push(await factory(workspace));
        }
      }

      const buildTasks = builders
        .map((builder) => builder?.build)
        .filter((build): build is Exclude<typeof build, null | undefined> => {
          return Boolean(build);
        });

      const startTasks = builders
        .map((builder) => builder?.start)
        .filter((start): start is Exclude<typeof start, null | undefined> => {
          return Boolean(start);
        });

      if (!buildTasks.length) {
        workspace.status.set('skipped', 'no build tasks');

        if (!startTasks.length) {
          workspace.isSelected = false;
          return;
        }
      }

      workspaceBuildTasks.set(workspace, buildTasks);
      workspaceStartTasks.set(workspace, startTasks);
    });

    if (options.clean) {
      await workspaces.forEachSequential(async (workspace) => {
        if (workspaceBuildTasks.get(workspace)?.length) {
          await workspace.clean();
        }
      });
    }

    await workspaces.forEach(async (workspace) => {
      const tasks = workspaceBuildTasks.get(workspace);

      if (!tasks?.length) return;

      for (const task of tasks) {
        await task();
      }

      const binFilenames = workspace
        .getEntrypoints()
        .filter((entry) => entry.type === 'bin')
        .map((entry) => entry.filename);

      for (const binFilename of binFilenames) {
        const stats = await workspace.fs.stat(binFilename);

        if (stats) {
          await nodeFs.promises
            .chmod(binFilename, stats.mode | 0o111)
            .catch((error) => {
              workspace.log.debug(error);
            });
        }
      }
    });

    const updateNames = Array.from(workspaceBuildTasks.entries())
      .filter(([, tasks]) => tasks.length)
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
        const tasks = workspaceStartTasks.get(workspace);

        if (!tasks?.length) return;

        await Promise.all(
          tasks.map(async (task) => {
            await task();
          }),
        );
      });
    }
  },
});
