import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { type Command } from '@commander-js/extra-typings';
import { Sema as Semaphore } from 'async-sema';
import chalk from 'chalk';

import { loadCommand } from './command.js';
import { createCommander } from './commander.js';
import { onError } from './error.js';
import { log } from './log.js';
import {
  getAlphabeticalWorkspaces,
  getDependencyOrderedWorkspaces,
  getWorkspaceDependencyNames,
  isWorkspaceSelected,
  type WorkspaceOptions,
} from './workspace.js';

interface MainActionOptions {
  commander: Command<any, any>;
  cmd: string;
  cmdArgs: string[];
  cmdOpts: {
    parallel?: number;
    alphabetical?: boolean;
    prefix?: boolean;
    workspace?: string[];
    keyword?: string[];
    notKeyword?: string[];
    private?: boolean;
    public?: boolean;
  };
}

type PrefixColor = (typeof PREFIX_COLORS)[number];

process.on('unhandledRejection', onError);
process.on('uncaughtException', onError);

const PREFIX_COLORS = ['cyan', 'magenta', 'yellow', 'blue', 'green', 'red'] as const;

const mainAction = async ({ commander: parentCommander, cmd, cmdArgs, cmdOpts }: MainActionOptions): Promise<void> => {
  const npm = await import('./npm/all.js');
  const { command, commandFilename } = await loadCommand(cmd, npm.workspacesRoot, npm.globalNodeModules);

  process.chdir(npm.globalNodeModules);

  const commander = createCommander(cmd).copyInheritedSettings(parentCommander);
  const action = commander.action.bind(commander);
  const queuedActions: ((...args: any[]) => void | Promise<void>)[] = [];

  commander.action = (queuedAction) => {
    queuedActions.push(queuedAction);
    return commander;
  };

  command.init({ main: commandFilename, rootDir: npm.workspacesRoot, commander });

  action(async (...subcommandArgs) => {
    for (const queuedAction of queuedActions) {
      await queuedAction(...subcommandArgs);
      process.chdir(npm.workspacesRoot);
    }

    const { parallel = 1, alphabetical = false, prefix = false, ...filters } = cmdOpts;
    const workspacesArray: WorkspaceOptions[] = Array.from(npm.workspaces.values()).map((value) => ({
      ...value,
      selected: isWorkspaceSelected(value, filters),
    }));
    const workspaces = alphabetical
      ? getAlphabeticalWorkspaces(workspacesArray)
      : getDependencyOrderedWorkspaces(workspacesArray);
    const args = commander.processedArgs;
    const opts = commander.opts();

    await command.before({
      main: commandFilename,
      rootDir: npm.workspacesRoot,
      args,
      opts,
      workspaces,
      isWorker: false,
      workerData: null,
    });

    const semaphore = parallel > 0 ? new Semaphore(parallel) : null;
    const promises = new Map<string, Promise<void>>();
    let prefixColorIndex = 0;

    for (const workspace of workspaces.values()) {
      const logPrefixColor = PREFIX_COLORS[prefixColorIndex++ % PREFIX_COLORS.length] as PrefixColor;
      const logPrefix = prefix ? chalk.bold(chalk[`${logPrefixColor}Bright`](workspace.name) + ': ') : '';
      const dependencyNames = getWorkspaceDependencyNames(workspace);
      const prerequisites = Promise.allSettled([...dependencyNames].map((name) => promises.get(name)));
      const promise = Promise.resolve().then(async () => {
        await prerequisites;
        await semaphore?.acquire();

        try {
          log.notice(`: ${workspace.name}`);
          await command.each({
            main: commandFilename,
            log: { prefix: logPrefix, trim: Boolean(logPrefix) },
            rootDir: npm.workspacesRoot,
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

      if (!alphabetical) promises.set(workspace.name, promise);
    }

    await command.after({
      main: commandFilename,
      rootDir: npm.workspacesRoot,
      args,
      opts,
      workspaces,
      isWorker: false,
      workerData: null,
    });
  });

  commander.name(cmd);
  await commander.parseAsync(cmdArgs, { from: 'user' });
};

export const main = async (): Promise<void> => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const version = await readFile(join(__dirname, '../package.json'), 'utf8').then((json) => JSON.parse(json).version);
  const commander = createCommander('werk')
    .description('Modular and extensible monorepo command framework.')
    .addHelpText('after', 'To get help for a specific command, run `werk <command> --help`.')
    .argument('<command>', 'Command to run.')
    .argument('[options...]', 'Options to pass to the command.')
    .option('-p, --parallel <count>', 'Process workspaces in parallel (0 = unlimited).', (value) => {
      const count = Number(value);
      if (Number.isNaN(count) || count < 0) {
        throw new Error('Parallel count must be a positive integer or zero.');
      }
      return count;
    })
    .option('-a, --alphabetical', 'Process workspaces alphabetically.')
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
    .option('--no-prefix', 'Do not prefix output.')
    .version(version)
    .passThroughOptions()
    .action((cmd, cmdArgs, options) => mainAction({ commander, cmd, cmdArgs, cmdOpts: options }));

  await commander.parseAsync().catch(onError);
};
