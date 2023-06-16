import { type Command, type CommandUnknownOpts } from '@commander-js/extra-typings';
import { Sema as Semaphore } from 'async-sema';
import chalk from 'chalk';

import { loadCommandPlugin } from './command/load-command-plugin.js';
import { Commander, getCommanderMetadata } from './commander/commander.js';
import { type Config } from './config.js';
import { CleanupContext } from './context/cleanup-context.js';
import { type GlobalOptions } from './options.js';
import { getWorkspaceDependencyNames } from './workspace/get-workspace-dependency-names.js';
import { getWorkspaces } from './workspace/get-workspaces.js';

interface MainActionOptions {
  readonly config: Config;
  readonly commander: Command<any, any>;
  readonly cmd: string;
  readonly cmdArgs: readonly string[];
  readonly globalOpts: GlobalOptions;
}

type PrefixColor = (typeof PREFIX_COLORS)[number];

const PREFIX_COLORS = ['cyan', 'magenta', 'yellow', 'blue', 'green', 'red'] as const;

export const mainAction = async ({ config, commander, cmd, cmdArgs, globalOpts }: MainActionOptions): Promise<void> => {
  const commandPlugin = await loadCommandPlugin(cmd, config);
  const { command, ...commandInfo } = commandPlugin;
  const workspaces = await getWorkspaces(config.workspaces, config.rootDir, {
    ...globalOpts.select,
    ...globalOpts.git,
  });
  const subCommander = new Commander().copyInheritedSettings(commander as CommandUnknownOpts);

  process.chdir(config.rootDir);

  if (command.init({ command: commandInfo, rootDir: config.rootDir, commander: subCommander }) !== subCommander) {
    throw new Error(`Command "${cmd}" did not return the correct commander instance. Did it return a sub-command?`);
  }

  process.on('exit', (exitCode) => {
    const context = new CleanupContext({
      command: commandInfo,
      rootDir: config.rootDir,
      args: commander.processedArgs,
      opts: commander.opts(),
      exitCode,
    });

    command.cleanup(context);
  });
  ['uncaughtException', 'unhandledRejection', 'SIGINT', 'SIGTERM', 'SIGUSR1', 'SIGUSR2'].forEach((event) => {
    process.on(event, () => process.exit(process.exitCode || 1));
  });

  const { isVersionSet, isDescriptionSet } = getCommanderMetadata(subCommander);
  const { packageJson } = commandInfo;

  if (!isDescriptionSet && packageJson.description) subCommander.description(packageJson.description);
  if (!isVersionSet && packageJson.version) subCommander.version(packageJson.version);

  subCommander.name(`${commander.name()} ${cmd}`).parse(cmdArgs, { from: 'user' });

  const args = subCommander.processedArgs;
  const opts = subCommander.opts();
  const { gitHead, gitFromRevision } = globalOpts.git;

  await command.before({
    log: undefined,
    command: commandInfo,
    rootDir: config.rootDir,
    args,
    opts,
    workspaces,
    gitHead,
    gitFromRevision,
    isWorker: false,
    workerData: null,
  });

  if (process.exitCode != null) return;

  const { parallel, concurrency, wait } = globalOpts.run;
  const { prefix } = globalOpts.log;
  const semaphore = concurrency || !parallel ? new Semaphore(concurrency ?? 1) : null;
  const promises = new Map<string, Promise<void>>();
  let prefixColorIndex = 0;

  for (const workspace of workspaces.values()) {
    const logPrefixColor = PREFIX_COLORS[prefixColorIndex++ % PREFIX_COLORS.length] as PrefixColor;
    const logPrefix = prefix ? chalk.bold(chalk[`${logPrefixColor}Bright`](workspace.name) + ': ') : '';
    const dependencyNames = getWorkspaceDependencyNames(workspace);
    const prerequisites = Promise.allSettled(dependencyNames.map((name) => promises.get(name)));
    const promise = Promise.resolve().then(async () => {
      if (wait || command.isWaitForced) await prerequisites;
      await semaphore?.acquire();

      try {
        if (process.exitCode != null) return;

        await command.each({
          log: { prefix: logPrefix },
          command: commandInfo,
          rootDir: config.rootDir,
          args,
          opts,
          workspaces,
          workspace,
          gitHead,
          gitFromRevision,
          isWorker: false,
          workerData: null,
        });
      } finally {
        semaphore?.release();
      }
    });

    promises.set(workspace.name, promise);
  }

  await Promise.all(promises.values());

  if (process.exitCode != null) return;

  await command.after({
    log: undefined,
    command: commandInfo,
    rootDir: config.rootDir,
    args,
    opts,
    workspaces,
    gitHead,
    gitFromRevision,
    isWorker: false,
    workerData: null,
  });
};
