import nodeAssert from 'node:assert';
import nodeFs from 'node:fs/promises';
import nodePath from 'node:path';
import nodeUrl from 'node:url';

import { Cli, CliUsageError } from '@wurk/cli';
import { JsonAccessor } from '@wurk/json';
import { getAnsiColorIterator, log, setLogLevel } from '@wurk/log';
import { createPackageManager } from '@wurk/pm';
import { AbortError, Workspace, Workspaces } from '@wurk/workspace';

import { env } from './env.js';
import { loadCommandPlugins } from './plugin.js';

interface Filter {
  readonly type: 'include' | 'exclude';
  readonly expression: string;
}

const __dirname = nodePath.dirname(nodeUrl.fileURLToPath(import.meta.url));
const configFilename = nodePath.join(__dirname, '../package.json');
const config = await nodeFs.readFile(configFilename, 'utf8')
  .then(JsonAccessor.parse);
const version = config
  .at('version')
  .as('string');
const description = config
  .at('description')
  .as('string');

const pm = await createPackageManager();

process.chdir(pm.rootDir);

const rootConfigFilename = nodePath.join(pm.rootDir, 'package.json');
const rootConfig = await nodeFs.readFile(rootConfigFilename, 'utf8')
  .then(JsonAccessor.parse);
const commands = await loadCommandPlugins(rootConfig, pm.rootDir);

let cli = Cli.create('wurk')
  .description(description)
  .version(version)
  .optionHelp()
  .optionVersion()

  // Workspace Options:
  .option('-i, --include <expression>', {
    description: 'include workspaces by name, directory, keyword, etc.',
    key: 'filters',
    group: 'Filter Options',
    parse: (expression, previous: [Filter, ...Filter[]] | undefined): [Filter, ...Filter[]] => {
      return [...(previous ?? []), { type: 'include', expression }];
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
  .option('-p, --parallel', {
    description:
        'process all workspaces simultaneously without topological awaiting',
    group: 'Parallelization Options',
  })
  .option('-s, --stream', {
    description: 'process workspaces concurrently with topological awaiting',
    group: 'Parallelization Options',
  })
  .option('-c, --concurrency <count>', {
    description: 'maximum number of simultaneous streaming workspaces',
    group: 'Parallelization Options',
    parse: (value) => {
      const count = Number(value);
      nodeAssert(Number.isInteger(count), 'concurrency must be an integer');
      nodeAssert(count > 0, 'concurrency must be a non-zero positive number');
      return count;
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

  // Command Fallback:
  .setCommandOptional()
  .setUnknownNamedOptionAllowed()
  .option('[script]', 'run a root package script')
  .option('[script-args...]', 'arguments for the script')

  // Trailers:
  .trailer('See the docs for more information about workspace filtering options: https://www.npmjs.com/package/wurk#filter-options')
  .trailer('To get help for a specific command, run `wurk <command> --help`.')

  .action(async ({ options, commandResult }) => {
    const {
      filters = JsonAccessor.parse(env.WURK_WORKSPACE_FILTERS)
        .as('array', [] as unknown[])
        .filter((value): value is Filter => {
          if (typeof value !== 'object') return false;
          if (value == null) return false;
          if (!('type' in value)) return false;
          if (value.type !== 'include' && value.type !== 'exclude') return false;
          if (!('expression' in value)) return false;
          if (typeof value.expression !== 'string') return false;
          return true;
        }),
      parallel = JsonAccessor.parse(env.WURK_PARALLEL)
        .as('boolean', false),
      stream = JsonAccessor.parse(env.WURK_STREAM)
        .as('boolean', false),
      concurrency = JsonAccessor.parse(env.WURK_CONCURRENCY)
        .as('number'),
      script,
      scriptArgs,
    } = options;

    const commandName = Object.keys(commandResult)
      .at(0);

    preventRecursion(commandName ?? script);

    const workspaceDirs = await pm.getWorkspaces();
    const workspaceEntries = await Promise.all(workspaceDirs.map(async (workspaceDir) => {
      const workspaceConfigFilename = nodePath.join(workspaceDir, 'package.json');
      const workspaceConfig = await nodeFs.readFile(workspaceConfigFilename, 'utf8')
        .then(JsonAccessor.parse);

      if (!workspaceConfig.at('name')) {
        throw new Error(`workspace at "${workspaceDir}" has no name`);
      }

      return [workspaceDir, workspaceConfig] as const;
    }));
    const root: Workspace = new Workspace({
      config: rootConfig,
      dir: pm.rootDir,
      getPublished: async () => root.version ? await pm.getMetadata(root.name, `<=${root.version}`) : null,
    });
    const workspaces = new Workspaces({
      rootDir: pm.rootDir,
      workspaces: workspaceEntries,
      concurrency,
      defaultIterationMethod: parallel
        ? 'forEachParallel'
        : stream
          ? 'forEachStream'
          : 'forEachSequential',
      getPublished: async (name, workspaceVersion) => await pm.getMetadata(name, `<=${workspaceVersion}`),
    });
    const allWorkspaces = new Set([...workspaces.all, root]);
    const colors = getAnsiColorIterator({
      loop: true,
      count: allWorkspaces.size,
    });

    allWorkspaces.forEach((workspace) => {
      workspace.log.prefix = workspace.name;
      workspace.log.prefixStyle = colors.next().value;
    });

    if (filters.length === 0 || filters.every(({ type }) => type === 'exclude')) {
      // If no filters are provided, or if all filters are exclusions, then
      // start by including all workspaces.
      await workspaces.include('**');
    }

    // Apply all filters.
    for (const filter of filters) {
      await workspaces[filter.type](filter.expression);
    }

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

    env.WURK_WORKSPACE_FILTERS = JSON.stringify(filters);
    env.WURK_PARALLEL = JSON.stringify(parallel);
    env.WURK_STREAM = JSON.stringify(stream);
    env.WURK_CONCURRENCY = JSON.stringify(concurrency);

    if (script) {
      if (
        root.config
          .at('scripts')
          .at(script)
          .as('string') == null
      ) {
        throw new CliUsageError(`"${script}" is not a command or root package script`);
      }

      await pm.spawnPackageScript(script, scriptArgs, { stdio: 'inherit' });
    }
  });

for (const command of commands) {
  cli = cli.command(command.cli);
}

const preventRecursion = (commandOrScript: string | undefined): void => {
  const running = env.WURK_RUNNING_COMMANDS?.split(/\s*,\s*/u) ?? [];

  if (commandOrScript && running.includes(commandOrScript)) {
    // Block commands from recursively calling themselves, even indirectly.
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(0);
  }

  env.WURK_RUNNING_COMMANDS = [...running, commandOrScript].join(',');
};

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
