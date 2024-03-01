import assert from 'node:assert';
import os from 'node:os';

import { Cli } from '@wurk/cli';
import { JsonAccessor } from '@wurk/json';
import { Ansi, ANSI_COLORS, log, setLogLevel } from '@wurk/log';
import { WorkspaceCollection } from '@wurk/workspace';

import { env } from './env.js';
import { getNpmWorkspaces } from './npm.js';
import { loadCommandPlugins } from './plugin.js';

export const main = (): void => {
  mainAsync().catch((error: unknown) => {
    process.exitCode ||= 1;
    log.error({ message: error });
  });
};

const mainAsync = async (): Promise<void> => {
  const { version, description, npmRoot } = await import('./config.js');

  process.chdir(npmRoot.dir);
  process.chdir = () => {
    throw new Error(
      'command plugin tried to change the working directory (unsupported)',
    );
  };

  const commandPlugins = await loadCommandPlugins(npmRoot.dir, npmRoot.config);

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
    .option('-p, --parallel', {
      description: 'process workspaces in parallel',
      group: 'Parallelization Options',
    })
    .option('--no-parallel', {
      description: 'process workspaces serially',
      group: 'Parallelization Options',
      hidden: true,
    })
    .optionNegation('parallel', 'noParallel')
    .option('-c, --concurrency <count>', {
      description:
        'number of workspaces to process in parallel (<number>, "auto", "all")',
      group: 'Parallelization Options',
      parse: (value) => {
        const concurrency = getConcurrency(value);
        assert(
          concurrency > 0,
          'concurrency must be a non-zero positive number',
        );
        return concurrency;
      },
    })
    .optionAction('concurrency', ({ result }) => {
      result.options.parallel = true;
    })

    // Logging Options:
    .option('--loglevel <level>', {
      description:
        'set the log level. (silent, error, warn, notice, info, verbose, silly)',
      group: 'Logging Options',
      key: null,
      parse: setLogLevel,
    })
    .option('--clear', {
      description: 'clear the screen on startup',
      group: 'Logging Options',
    })
    .option('--no-clear', {
      description: 'do not clear the screen on startup',
      group: 'Logging Options',
      hidden: true,
    })
    .optionNegation('clear', 'noClear')

    .action(async ({ options, command }) => {
      const {
        clear = false,
        expressions = JsonAccessor.parse(env.WURK_WORKSPACE_EXPRESSIONS)
          .as('array', [] as unknown[])
          .filter((value): value is string => typeof value === 'string'),
        includeRootWorkspace = env.WURK_INCLUDE_ROOT_WORKSPACE === 'true',
        parallel = env.WURK_PARALLEL === 'true',
        concurrency = getConcurrency(env.WURK_CONCURRENCY),
      } = options;
      const running = env.WURK_RUNNING_COMMANDS?.split(/\s*,\s*/u) ?? [];
      const commandName = Object.keys(command).at(0)!;

      if (running.includes(commandName)) {
        // Block commands from recursively calling themselves, even indirectly.
        // eslint-disable-next-line unicorn/no-process-exit
        process.exit(0);
      }

      env.WURK_RUNNING_COMMANDS = [...running, commandName].join(',');

      if (clear && !running.length) {
        process.stdout.write(Ansi.clear);
      }

      const npmWorkspaces = await getNpmWorkspaces();
      const workspaces = new WorkspaceCollection({
        root: npmRoot.config,
        rootDir: npmRoot.dir,
        workspaces: npmWorkspaces.map((npmWorkspace) => [
          npmWorkspace.dir,
          npmWorkspace.config,
        ]),
        includeRootWorkspace:
          includeRootWorkspace || npmWorkspaces.length === 0,
        concurrency: parallel ? concurrency : 1,
      });

      Array.from(workspaces.all).forEach((workspace, i) => {
        workspace.log.prefix = workspace.name;
        workspace.log.prefixColor = ANSI_COLORS[i % ANSI_COLORS.length]!;
      });

      workspaces.select(expressions.length ? expressions : '**');
      commandPlugins.forEach((commandPlugin) => commandPlugin.init(workspaces));

      env.WURK_WORKSPACE_EXPRESSIONS = JSON.stringify(expressions);
      env.WURK_INCLUDE_ROOT_WORKSPACE = String(includeRootWorkspace);
      env.WURK_PARALLEL = String(parallel);
      env.WURK_CONCURRENCY = String(concurrency);
    });

  for (const commandPlugin of commandPlugins) {
    cli = cli.command(commandPlugin.cli);
  }

  await cli.parse();
};

const getConcurrency = (value: string | undefined): number => {
  value = value?.toLocaleLowerCase();

  switch (value) {
    case undefined:
    case 'auto':
      return os.cpus().length + 1;
    case 'all':
    case 'infinite':
    case 'infinity':
    case 'unlimited':
      return Number.POSITIVE_INFINITY;
    default:
      return Number.parseInt(value, 10);
  }
};
