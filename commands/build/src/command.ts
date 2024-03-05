import assert from 'node:assert';
import nodeFs from 'node:fs';

import { createCommand, type Workspace } from 'wurk';

import { type BuilderFactory } from './builder.js';
import { getRollupBuilder } from './builders/rollup.js';
import { getScriptBuilder } from './builders/script.js';
import { getTscBuilder } from './builders/tsc.js';
import { getTypeDocBuilder } from './builders/typedoc.js';
import { getViteBuilder } from './builders/vite.js';

const BUILDER_FACTORIES = [
  getViteBuilder,
  getRollupBuilder,
  getTscBuilder,
  getTypeDocBuilder,
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
      .option('--start-delay <seconds>', {
        description: 'delay starting each workspace (implies --start)',
        parse: (value) => {
          const seconds = Number.parseInt(value, 10);

          assert(
            !Number.isNaN(seconds) && seconds > 0,
            'start delay must be a positive number',
          );

          return seconds;
        },
      })
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

        if (options.startDelay != null) {
          options.start = true;
        }
      });
  },

  action: async (context) => {
    const { log, options, workspaces, autoPrintStatus } = context;

    autoPrintStatus();

    const workspaceBuildTasks = new Map<Workspace, (() => Promise<void>)[]>();
    const workspaceStartTasks = new Map<Workspace, (() => Promise<void>)[]>();

    if (options.includeDependencies) {
      workspaces.includeDependencies();
    }

    await workspaces.forEach(async (workspace) => {
      const scriptBuilder = await getScriptBuilder(workspace);
      const buildTasks: (() => Promise<void>)[] = [];
      const startTasks: (() => Promise<void>)[] = [];

      if (scriptBuilder?.build && scriptBuilder?.start) {
        buildTasks.push(scriptBuilder.build);
        startTasks.push(scriptBuilder.start);
      } else {
        if (scriptBuilder?.build) {
          buildTasks.push(scriptBuilder.build);
        }

        if (scriptBuilder?.start) {
          startTasks.push(scriptBuilder.start);
        }

        for (const factory of BUILDER_FACTORIES) {
          const builder = await factory(workspace);

          if (!scriptBuilder?.build && builder?.build) {
            buildTasks.push(builder.build);
          }

          if (!scriptBuilder?.start && builder?.start) {
            startTasks.push(builder.start);
          }
        }
      }

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

    if (options.start) {
      log.info`building...`;
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
            .catch((error: unknown) => {
              workspace.log.debug({ message: error });
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

      log.info`starting...`;

      let delayPromise = Promise.resolve();

      await Promise.all(
        Array.from(workspaces).map(async (workspace) => {
          const tasks = workspaceStartTasks.get(workspace);

          if (!tasks?.length) return;

          await Promise.all(
            tasks.map(async (task) => {
              if (options.startDelay != null) {
                await (delayPromise = delayPromise.then(() => {
                  return new Promise<void>((resolve) => {
                    setTimeout(() => resolve(), options.startDelay! * 1000);
                  });
                }));
              }

              await task();
            }),
          );
        }),
      );
    }
  },
});
