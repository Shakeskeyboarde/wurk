import nodeFs from 'node:fs';

import { createCommand, type Workspace } from 'wurk';

import { type Builder, type BuilderFactory } from './builder.js';
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
    const { log, options, workspaces, autoPrintStatus } = context;

    autoPrintStatus();

    const workspaceBuilds = new Map<Workspace, Builder[]>();
    const workspaceStarts = new Map<Workspace, Builder[]>();

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

      const buildTasks = builders.filter((builder): builder is Builder => {
        return Boolean(builder?.build);
      });

      const startTasks = builders.filter((builder): builder is Builder => {
        return Boolean(builder?.start);
      });

      if (!buildTasks.length) {
        workspace.status.set('skipped', 'no build tasks');

        if (!startTasks.length) {
          workspace.isSelected = false;
          return;
        }
      }

      workspaceBuilds.set(workspace, buildTasks);
      workspaceStarts.set(workspace, startTasks);
    });

    if (options.clean) {
      await workspaces.forEachSequential(async (workspace) => {
        if (workspaceBuilds.get(workspace)?.length) {
          await workspace.clean();
        }
      });
    }

    if (options.start) {
      log.info`building...`;
    }

    await workspaces.forEach(async (workspace) => {
      const builders = workspaceBuilds.get(workspace);

      if (!builders?.length) return;

      for (const builder of builders) {
        await builder.build!(
          builders.length > 1
            ? workspace.log.clone({
                prefix: `${workspace.log.prefix}[${builder.name}]`,
              })
            : workspace.log,
        );
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

    const updateNames = Array.from(workspaceBuilds.entries())
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

      await Promise.all(
        Array.from(workspaces).map(async (workspace) => {
          const builders = workspaceStarts.get(workspace);

          if (!builders?.length) return;

          await Promise.all(
            builders.map(async (builder) => {
              await builder.start!(
                builders.length > 1
                  ? workspace.log.clone({
                      prefix: `${workspace.log.prefix}[${builder.name}]`,
                    })
                  : workspace.log,
              );
            }),
          );
        }),
      );
    }
  },
});
