import nodeAssert from 'node:assert';
import nodeFs from 'node:fs/promises';
import nodePath from 'node:path';

import { Cli, CliUsageError } from '@wurk/cli';
import { JsonAccessor } from '@wurk/json';
import { getAnsiColorIterator, log, setLogLevel } from '@wurk/log';
import { createPackageManager } from '@wurk/pm';
import { spawn } from '@wurk/spawn';
import { AbortError, createWorkspacePredicate, Workspace, type WorkspacePredicate, Workspaces } from '@wurk/workspace';

import { Config } from './config.js';
import { loadCommandPlugins } from './plugin.js';
import { getSelf } from './self.js';

interface Filter {
  readonly type: 'include' | 'exclude';
  readonly expression: string;
}

export const main = async (): Promise<void> => {
  const [self, pm] = await Promise.all([
    getSelf(),
    createPackageManager(),
  ]);

  process.chdir(pm.rootDir);

  const [commands, workspaceDirs] = await Promise.all([
    loadCommandPlugins(pm),
    pm.getWorkspaces(),
  ]);

  let cli = Cli.create('wurk')
    .description(self.description)
    .version(self.version)
    .optionHelp()
    .optionVersion()

    // Workspace Options:
    .option('-i, --include <expression>', {
      description: 'include workspaces by name, directory, keyword, etc.',
      key: 'filters',
      group: 'Filter Options',
      parse: (expression, previous: Filter[] = []): Filter[] => {
        return [...previous, { type: 'include', expression }];
      },
    })
    .option('-e, --exclude <expression>', {
      description: 'exclude workspaces by name, directory, keyword, etc.',
      key: null,
      group: 'Filter Options',
      parse: (expression, _previous: void, result): void => {
        result.options.filters = [...(result.options.filters ?? []), { type: 'exclude', expression }];
      },
    })

    // Parallelization Options:
    .option('--parallel', {
      description:
        'process all workspaces simultaneously without topological awaiting',
      group: 'Parallelization Options',
    })
    .option('--stream', {
      description: 'process workspaces concurrently with topological awaiting',
      group: 'Parallelization Options',
    })
    .option('--concurrency <count>', {
      description: 'maximum number of simultaneous streaming workspaces',
      group: 'Parallelization Options',
      parse: (value) => {
        const count = Number(value);
        nodeAssert(Number.isInteger(count), 'concurrency must be an integer');
        nodeAssert(count > 0, 'concurrency must be a non-zero positive number');
        return count;
      },
    })
    .option('--delay-each-workspace <seconds>', {
      description: 'delay before starting to process the next workspace',
      group: 'Parallelization Options',
      key: 'delaySeconds',
      parse: (value): number => {
        const num = Number(value);
        nodeAssert(num, 'delay must be an integer');
        nodeAssert(num >= 0, 'delay must be a positive integer');
        return num;
      },
    })
    .optionAction('concurrency', ({ result }) => {
      result.options.stream = true;
    })

    // Logging Options:
    .option('--loglevel <level>', {
      description:
        'set the log level. (silent, error, warn, notice, info, verbose, silly)',
      group: 'Logging Options',
      key: null,
      parse: setLogLevel,
    })

    // Script "Command" Fallback:
    .setCommandOptional()
    .setUnknownNamedOptionAllowed()
    .option('[script]', 'run a root package script')
    .option('[script-args...]', 'arguments for the script')

    // Trailers:
    .trailer(`
      See the docs for more information about workspace filtering options:
      https://www.npmjs.com/package/wurk#filter-options
    `)
    .trailer('To get help for a specific command, run `wurk <command> --help`.')

    .action(async ({ options, commandResult }) => {
      const config = new Config();
      const {
        filters = config.filters,
        parallel = config.parallel,
        stream = config.stream,
        concurrency = config.concurrency,
        delaySeconds = config.delaySeconds,
        script,
        scriptArgs,
      } = options;

      config.filters = filters;
      config.parallel = parallel;
      config.stream = stream;
      config.concurrency = concurrency;

      const root: Workspace = new Workspace({
        config: pm.rootConfig,
        dir: pm.rootDir,
        getPublished: async () => {
          return root.version
            ? await pm.getPublished(root.name, root.version)
            : null;
        },
      });

      const workspaceEntries = await Promise.all(workspaceDirs.map(async (workspaceDir) => {
        const workspaceConfigFilename = nodePath.join(workspaceDir, 'package.json');
        const workspaceConfig = await nodeFs.readFile(workspaceConfigFilename, 'utf8')
          .then(JsonAccessor.parse);

        if (!workspaceConfig.at('name')) {
          throw new Error(`workspace at "${workspaceDir}" has no name`);
        }

        return [workspaceDir, workspaceConfig] as const;
      }));

      const workspaces = new Workspaces({
        rootDir: pm.rootDir,
        workspaceEntries,
        concurrency,
        delaySeconds,
        defaultIterationMethod: parallel
          ? 'forEachParallel'
          : stream
            ? 'forEachStream'
            : 'forEachSequential',
        getPublished: async (name, workspaceVersion) => {
          return await pm.getPublished(name, workspaceVersion);
        },
      });

      const colors = getAnsiColorIterator({ loop: true, count: workspaces.size + 1 });

      [...workspaces.all, root].forEach((workspace) => {
        workspace.log.prefix = workspace.name;
        workspace.log.prefixStyle = colors.next().value;
      });

      if (filters[0]?.type !== 'include') {
        // If the first filter is not an include, then start by including all
        // workspaces.
        await workspaces.include('**');
      }

      // Apply all filters.
      for (const filter of filters) {
        let predicate: WorkspacePredicate;

        try {
          predicate = createWorkspacePredicate(filter.expression);
        }
        catch (error) {
          throw CliUsageError.from(error);
        }

        await workspaces[filter.type](predicate);
      }

      const commandName = Object.keys(commandResult)
        .at(0);

      if (commandName) {
        const command = commands.find((plugin) => {
          return plugin.cli.name() === commandName;
        })!;

        // Pass the workspaces to the current command.
        //
        // XXX: Command plugins are loaded before the workspaces are generated,
        // so this late initialization stage is necessary to avoid using global
        // state.
        command.init({ root, workspaces });
      }
      else if (script) {
        const exists = root.config
          .at('scripts')
          .at(script)
          .is('string');

        if (!exists) {
          throw new CliUsageError(`"${script}" is not a command or root package script`);
        }

        await spawn(pm.command, ['run', pm.command !== 'yarn' && '--', script, scriptArgs], {
          cwd: pm.rootDir,
          stdio: 'inherit',
          logCommand: false,
        });
      }
      else {
        throw new CliUsageError('command or script required');
      }
    });

  // Populate the CLI with the commands loaded from plugins.
  for (const command of commands) {
    cli = cli
      .command(command.cli)
      // Don't allow plugin commands to set themselves as default.
      .setDefault(false);
  }

  await cli
    .parse()
    .catch((error: unknown) => {
      process.exitCode ||= 1;

      if (error instanceof CliUsageError) {
        error.context?.printHelp(true);
      }

      if (!(error instanceof AbortError)) {
        // Abort errors are thrown by collection `forEach*` methods when
        // iteration throws an error or is otherwise aborted. Any associated
        // error is handled by the collection, so we don't need to log it
        // here.
        log.print({ message: error, to: 'stderr', color: 'red' });
      }
    });
};
