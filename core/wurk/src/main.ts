import nodeAssert from 'node:assert';
import nodeFs from 'node:fs/promises';
import nodePath from 'node:path';
import nodeUrl from 'node:url';

import { Cli, CliUsageError } from '@wurk/cli';
import { JsonAccessor } from '@wurk/json';
import { getAnsiColorIterator, log, setLogLevel } from '@wurk/log';
import { createPackageManager } from '@wurk/pm';
import { AbortError, WorkspaceCollection } from '@wurk/workspace';

import { env } from './env.js';
import { loadCommandPlugins } from './plugin.js';

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
const rootConfigFilename = nodePath.join(pm.rootDir, 'package.json');
const rootConfig = await nodeFs.readFile(rootConfigFilename, 'utf8')
  .then(JsonAccessor.parse);

process.chdir(pm.rootDir);
process.chdir = () => {
  throw new Error('command plugin tried to change the working directory (unsupported)');
};

const commandPlugins = await loadCommandPlugins(pm, rootConfig);

let cli = Cli.create('wurk')
  .description(description)
  .trailer('To get help for a specific command, run `wurk <command> --help`.')
  .version(version)
  .optionHelp()
  .optionVersion()

// Workspace Options:
  .option('-w, --workspace <expression>', {
    description:
        'select workspaces by name, keyword, directory, or private value',
    key: 'expressions',
    group: 'Workspace Options',
    parse: (
      value,
      previous: [string, ...string[]] | undefined,
    ): [string, ...string[]] => [...(previous ?? []), value],
  })
  .option('--include-root-workspace', {
    description: 'include the root workspace',
    group: 'Workspace Options',
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

  .action(async ({ options, command }) => {
    const {
      expressions = JsonAccessor.parse(env.WURK_WORKSPACE_EXPRESSIONS)
        .as('array', [] as unknown[])
        .filter((value): value is string => typeof value === 'string'),
      includeRootWorkspace = JsonAccessor.parse(env.WURK_INCLUDE_ROOT_WORKSPACE)
        .as('boolean', false),
      parallel = JsonAccessor.parse(env.WURK_PARALLEL)
        .as('boolean', false),
      stream = JsonAccessor.parse(env.WURK_STREAM)
        .as('boolean', false),
      concurrency = JsonAccessor.parse(env.WURK_CONCURRENCY)
        .as('number'),
      script,
      scriptArgs,
    } = options;
    const running = env.WURK_RUNNING_COMMANDS?.split(/\s*,\s*/u) ?? [];
    const commandName = Object.keys(command)
      .at(0)!;

    if (running.includes(commandName)) {
      // Block commands from recursively calling themselves, even indirectly.
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(0);
    }

    env.WURK_RUNNING_COMMANDS = [...running, commandName].join(',');

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
    const workspaces = new WorkspaceCollection({
      root: rootConfig,
      rootDir: pm.rootDir,
      workspaces: workspaceEntries,
      includeRootWorkspace,
      concurrency,
      defaultIterationMethod: parallel
        ? 'forEachParallel'
        : stream
          ? 'forEachStream'
          : 'forEachSequential',
    });
    const allWorkspaces = new Set([...workspaces.all, workspaces.root]);
    const colors = getAnsiColorIterator({
      loop: true,
      count: allWorkspaces.size,
    });

    allWorkspaces.forEach((workspace) => {
      workspace.log.prefix = workspace.name;
      workspace.log.prefixStyle = colors.next().value;
    });

    workspaces.select(expressions.length ? expressions : '**');
    commandPlugins.forEach((commandPlugin) => commandPlugin.init(workspaces));

    env.WURK_WORKSPACE_EXPRESSIONS = JSON.stringify(expressions);
    env.WURK_INCLUDE_ROOT_WORKSPACE = JSON.stringify(includeRootWorkspace);
    env.WURK_PARALLEL = JSON.stringify(parallel);
    env.WURK_STREAM = JSON.stringify(stream);
    env.WURK_CONCURRENCY = JSON.stringify(concurrency);

    if (script) {
      if (
        workspaces.root.config
          .at('scripts')
          .at(script)
          .as('string') == null
      ) {
        throw new Error(`"${script}" is not a command or root package script`);
      }

      await pm.spawnPackageScript(script, scriptArgs, { stdio: 'inherit' });
    }
  });

for (const commandPlugin of commandPlugins) {
  cli = cli.command(commandPlugin.cli);
}

await cli
  .parse()
  .catch((error: unknown) => {
    process.exitCode ||= 1;

    if (error instanceof CliUsageError) {
      cli.printHelp(error);
    }
    else if (!(error instanceof AbortError)) {
      // Abort errors are thrown by collection `forEach*` methods when
      // iteration throws an error or is otherwise aborted. Any associated
      // error is handled by the collection, so we don't need to log it
      // here.
      log.error({ message: error });
    }
  });
