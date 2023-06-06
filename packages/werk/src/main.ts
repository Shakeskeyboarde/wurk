import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { cpus } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Sema as Semaphore } from 'async-sema';
import chalk from 'chalk';

import { loadCommand } from './command/load-command.js';
import { type LoadedCommand } from './command/loaded-command.js';
import { Commander, getCommanderMetadata } from './commander/commander.js';
import { onError } from './error.js';
import { log, LOG_LEVEL, type LogLevel } from './log.js';
import { getDependencyOrderedWorkspaces } from './workspace/get-dependency-ordered-workspaces.js';
import { getWorkspaceDependencyNames } from './workspace/get-workspace-dependency-names.js';
import { selectWorkspaces } from './workspace/select-workspaces.js';
import { type WorkspaceOptions } from './workspace/workspace.js';

interface GlobalOptions {
  readonly logLevel?: string;
  readonly parallel?: boolean;
  readonly concurrency?: number;
  readonly workspace?: readonly string[];
  readonly keyword?: readonly string[];
  readonly notKeyword?: readonly string[];
  readonly private?: boolean;
  readonly public?: boolean;
  readonly order?: boolean;
  readonly prefix?: boolean;
}

interface MainActionOptions {
  readonly commander: Commander<any, any>;
  readonly cmd: string;
  readonly cmdArgs: readonly string[];
  readonly globalOptions: GlobalOptions;
}

interface CommandActionOptions {
  readonly rootDir: string;
  readonly workspacesArray: readonly WorkspaceOptions[];
  readonly args: unknown;
  readonly opts: unknown;
  readonly command: LoadedCommand;
  readonly globalOptions: GlobalOptions;
}

type PrefixColor = (typeof PREFIX_COLORS)[number];

const PREFIX_COLORS = ['cyan', 'magenta', 'yellow', 'blue', 'green', 'red'] as const;

process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'info';
process.on('unhandledRejection', onError);
process.on('uncaughtException', onError);

export const main = async (): Promise<void> => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const version = await readFile(join(__dirname, '../package.json'), 'utf8').then((json) => JSON.parse(json).version);
  const commander = new Commander('werk')
    .description('Modular and extensible monorepo command framework.')
    .addHelpText('after', 'To get help for a specific command, run `werk <command> --help`.')
    .argument('<command>', 'Command to run.')
    .argument('[options...]', 'Options to pass to the command.')
    .option(
      '-l, --log-level <level>',
      'Set the log level (silent, error, warn, notice, info, debug, trace).',
      (value): LogLevel => {
        assert(value in LOG_LEVEL, new Error(`Log level must be one of: ${Object.keys(LOG_LEVEL).join(', ')}.`));
        return value as LogLevel;
      },
    )
    .option('-p, --parallel', 'Process workspaces in parallel.')
    .option('-c, --concurrency <count>', 'Number of concurrent workspaces (number or "auto").', (value) => {
      if (value === 'auto') return cpus().length + 1;
      const count = Number(value);
      assert(!Number.isNaN(count), new Error('Concurrency count must be a number or "auto".'));
      assert(count > 0, new Error('Concurrency count must be greater than 0.'));
      return count;
    })
    .option(
      '-w, --workspace <name>',
      'Include workspaces by name.',
      (value, previous: string[] | undefined): string[] => [...(previous ?? []), value],
    )
    .option(
      '-k, --keyword <keyword>',
      'Include workspaces by keyword.',
      (value, previous: string[] | undefined): string[] => [...(previous ?? []), value],
    )
    .option(
      '--not-keyword <keyword>',
      'Exclude workspaces by keyword.',
      (value, previous: string[] | undefined): string[] => [...(previous ?? []), value],
    )
    .option('--no-private', 'Exclude private workspaces.')
    .option('--no-public', 'Exclude public workspaces.')
    .option('--no-order', 'Do not order workspaces by interdependency.')
    .option('--no-prefix', 'Do not prefix output.')
    .version(version)
    .passThroughOptions()
    .action(async (cmd, cmdArgs, globalOptions) => {
      process.env.LOG_LEVEL = commander.opts().logLevel ?? process.env.LOG_LEVEL;
      await mainAction({ commander, cmd, cmdArgs, globalOptions });
    });

  await commander.parseAsync().catch(onError);
};

const mainAction = async ({ commander, cmd, cmdArgs, globalOptions }: MainActionOptions): Promise<void> => {
  const { globalNodeModules, workspacesRoot, workspaces: workspacesArray } = await import('./npm/all.js');
  const command = await loadCommand(cmd, workspacesRoot, globalNodeModules);

  process.chdir(globalNodeModules);

  const subCommander = commander.command(cmd);

  command.init({ main: command.main, rootDir: workspacesRoot, commander: subCommander });

  const { isVersionSet, isDescriptionSet } = getCommanderMetadata(subCommander);

  if (!isDescriptionSet && command.description) subCommander.description(command.description);
  if (!isVersionSet) subCommander.version(command.version);

  await subCommander
    .name(cmd)
    .action(async () => {
      const args = subCommander.processedArgs;
      const opts = subCommander.opts();

      await commandAction({ rootDir: workspacesRoot, workspacesArray, args, opts, command, globalOptions });
    })
    .parseAsync(cmdArgs, { from: 'user' });
};

const commandAction = async ({
  rootDir,
  workspacesArray,
  args,
  opts,
  command,
  globalOptions,
}: CommandActionOptions): Promise<void> => {
  const { concurrency, parallel = Boolean(concurrency), order = true, prefix = false, ...filters } = globalOptions;
  const workspaces = order ? getDependencyOrderedWorkspaces(workspacesArray) : workspacesArray;

  selectWorkspaces(workspaces.values(), filters);

  await command.before({
    main: command.main,
    rootDir,
    args,
    opts,
    workspaces,
    isWorker: false,
    workerData: null,
  });

  const semaphore = concurrency || !parallel ? new Semaphore(concurrency ?? 1) : null;
  const promises = new Map<string, Promise<void>>();
  let prefixColorIndex = 0;

  for (const workspace of workspaces.values()) {
    const logPrefixColor = PREFIX_COLORS[prefixColorIndex++ % PREFIX_COLORS.length] as PrefixColor;
    const logPrefix = prefix ? chalk.bold(chalk[`${logPrefixColor}Bright`](workspace.name) + ': ') : '';
    const dependencyNames = getWorkspaceDependencyNames(workspace);
    const prerequisites = Promise.allSettled(dependencyNames.map((name) => promises.get(name)));
    const promise = Promise.resolve().then(async () => {
      await prerequisites;
      await semaphore?.acquire();

      try {
        log.notice(`: ${workspace.name}`);
        await command.each({
          main: command.main,
          log: { prefix: logPrefix, trim: Boolean(logPrefix) },
          rootDir,
          args,
          opts,
          workspaces,
          workspace,
          isWorker: false,
          workerData: null,
        });
      } finally {
        semaphore?.release();
      }
    });

    if (order) promises.set(workspace.name, promise);
  }

  await command.after({
    main: command.main,
    rootDir,
    args,
    opts,
    workspaces,
    isWorker: false,
    workerData: null,
  });
};
