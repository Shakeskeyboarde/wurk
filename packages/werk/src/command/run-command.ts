import assert from 'node:assert';

import { Sema as Semaphore } from 'async-sema';
import chalk from 'chalk';

import { type Config } from '../config.js';
import { CleanupContext } from '../context/cleanup-context.js';
import { type GlobalOptions } from '../options.js';
import { log } from '../utils/log.js';
import { getWorkspaceDependencyNames } from '../workspace/get-workspace-dependency-names.js';
import { getWorkspaces } from '../workspace/get-workspaces.js';
import { type CommandPlugin } from './load-command-plugins.js';

type PrefixColor = (typeof PREFIX_COLORS)[number];

const PREFIX_COLORS = ['cyan', 'magenta', 'yellow', 'blue', 'green', 'red'] as const;

export const runCommand = async (
  globalConfig: Config,
  globalOpts: GlobalOptions,
  { command, commandName, commandMain, commander }: CommandPlugin,
): Promise<void> => {
  assert(
    !command.packageManager || command.packageManager.includes(globalConfig.packageManager),
    `Command "${commandName}" does not support package manager "${globalConfig.packageManager}".`,
  );

  const config = globalConfig.commandConfigs[commandName];
  const args = commander.processedArgs;
  const opts = commander.opts();
  const [root, workspaces, isMonorepo] = await getWorkspaces({
    rootPackage: globalConfig.rootPackage,
    workspacePackages: globalConfig.workspacePackages,
    commandName,
    ...globalOpts.select,
    ...globalOpts.git,
  });

  if (workspaces.length === 0) {
    log.warn('No workspaces selected.');
    return;
  }

  process.chdir = () => {
    log.warnOnce('A command plugin tried to change the working directory. This is not supported.');
  };

  process.on('exit', (exitCode) => {
    const context = new CleanupContext({
      log: undefined,
      config,
      rootDir: globalConfig.rootPackage.dir,
      args: commander.processedArgs,
      opts: commander.opts(),
      exitCode,
      packageManager: globalConfig.packageManager,
    });

    command.cleanup(context);
  });
  ['uncaughtException', 'unhandledRejection', 'SIGINT', 'SIGTERM', 'SIGUSR1', 'SIGUSR2'].forEach((event) => {
    process.on(event, () => process.exit(process.exitCode || 1));
  });

  const { gitHead, gitFromRevision } = globalOpts.git;
  const matrixValues = await command.before({
    log: undefined,
    config,
    commandMain,
    args,
    opts,
    root,
    workspaces,
    gitHead,
    gitFromRevision,
    isWorker: false,
    workerData: null,
    packageManager: globalConfig.packageManager,
  });

  if (process.exitCode != null) return;

  const { concurrency, wait } = globalOpts.run;
  const prefix = globalOpts.log.prefix && isMonorepo;
  const semaphore = concurrency > 0 ? new Semaphore(concurrency) : null;
  const promises = new Map<string, Promise<any>>();

  let prefixColorIndex = 0;

  for (const workspace of workspaces.values()) {
    const prefixColor = PREFIX_COLORS[prefixColorIndex++ % PREFIX_COLORS.length] as PrefixColor;
    const formatPrefix = (value: string): string => chalk.bold(chalk[`${prefixColor}Bright`](value));

    if (wait || command.isWaitForced) {
      await Promise.allSettled(getWorkspaceDependencyNames(workspace).map((name) => promises.get(name)));
    }

    const promise = Promise.all(
      (matrixValues ?? [undefined]).map(async (matrixValue): Promise<void> => {
        await semaphore?.acquire();

        try {
          if (process.exitCode != null) return;

          await command.each({
            isParallel: concurrency !== 1,
            log: { prefix: prefix ? workspace.name : undefined, formatPrefix },
            config,
            commandMain,
            args,
            opts,
            root,
            workspaces,
            workspace,
            matrixValue,
            gitHead,
            gitFromRevision,
            isWorker: false,
            workerData: null,
            packageManager: globalConfig.packageManager,
          });
        } finally {
          semaphore?.release();
        }
      }),
    );

    promises.set(workspace.name, promise);
  }

  await Promise.all(promises.values());

  if (process.exitCode != null) return;

  await command.after({
    log: undefined,
    config,
    commandMain,
    args,
    opts,
    root,
    workspaces,
    gitHead,
    gitFromRevision,
    isWorker: false,
    workerData: null,
    packageManager: globalConfig.packageManager,
  });
};
