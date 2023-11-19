import { Sema as Semaphore } from 'async-sema';
import chalk from 'chalk';

import { type Config } from '../config.js';
import { AfterContext } from '../context/after-context.js';
import { BeforeContext } from '../context/before-context.js';
import { CleanupContext } from '../context/cleanup-context.js';
import { EachContext } from '../context/each-context.js';
import { type GlobalOptions } from '../options.js';
import { log } from '../utils/log.js';
import { createWorkspaces } from '../workspace/create-workspaces.js';
import { type CommandPlugin } from './load-command-plugins.js';

type PrefixColor = (typeof PREFIX_COLORS)[number];

const PREFIX_COLORS = ['cyan', 'magenta', 'yellow', 'blue', 'green', 'red'] as const;

export const runCommandPlugin = async (
  globalConfig: Config,
  globalOpts: GlobalOptions,
  plugin: CommandPlugin,
): Promise<void> => {
  let isWaitingEnabled = true;

  const destroy: (() => void)[] = [];
  const { command, commander } = plugin;
  const args = commander.processedArgs;
  const opts = commander.opts();
  const { rawRootWorkspace, rawWorkspaces } = globalConfig;
  const { log: logOptions, git, select, run } = globalOpts;
  const isMonorepo = rawWorkspaces.length > 1;
  const { gitFromRevision } = git;
  const workspaceMatchers = [...select.workspace].reverse();
  const [root, workspaces] = createWorkspaces({
    rawRootWorkspace: rawRootWorkspace,
    rawWorkspaces: rawWorkspaces,
    includeRootWorkspace: select.includeRootWorkspace,
    gitFromRevision: gitFromRevision,
  });

  workspaces.forEach((workspace) => {
    if (workspaceMatchers.length) {
      const matcher = workspaceMatchers.find(({ match }) => match(workspace.name));

      if (matcher) {
        workspace.isSelected = matcher.isSelected;
      }
    } else {
      workspace.isSelected = !workspace.isRoot;
    }
  });

  if (select.dependencies) {
    workspaces.forEach((workspace) => {
      if (!workspace.isSelected) return;

      workspace.localDependencies.forEach((dependency) => {
        dependency.workspace.isSelected = true;
      });
    });
  }

  process.on('exit', (exitCode) => {
    const context = new CleanupContext({
      log: undefined,
      rootDir: rawRootWorkspace.dir,
      args: commander.processedArgs,
      opts: commander.opts(),
      exitCode,
    });

    command.cleanup(context);
    context.destroy();
    destroy.forEach((callback) => callback());
  });

  ['uncaughtException', 'unhandledRejection', 'SIGINT', 'SIGTERM', 'SIGUSR1', 'SIGUSR2'].forEach((event) => {
    process.on(event, () => process.exit(process.exitCode || 1));
  });

  const beforeContext = new BeforeContext({
    log: undefined,
    args,
    opts,
    root,
    workspaces,
    onWaitForDependencies: (enabled) => (isWaitingEnabled = enabled),
  });

  destroy.unshift(() => beforeContext.destroy());

  const matrixValues = await command.before(beforeContext);

  if (process.exitCode != null) return;

  const { concurrency } = run;
  const prefix = logOptions.prefix && isMonorepo;
  const semaphore = concurrency > 0 ? new Semaphore(concurrency) : null;
  const promises = new Map<string, Promise<any>>();

  let prefixColorIndex = 0;

  for (const workspace of workspaces.values()) {
    const prefixColor = PREFIX_COLORS[prefixColorIndex++ % PREFIX_COLORS.length] as PrefixColor;
    const formatPrefix = (value: string): string => chalk.bold(chalk[`${prefixColor}Bright`](value));

    if (isWaitingEnabled) {
      await workspace.localDependencies.mapAsync(
        (dependency) => dependency.isDirect && promises.get(dependency.workspace.name),
      );
    }

    const promise = Promise.all(
      (matrixValues ?? [undefined]).map(async (matrixValue): Promise<void> => {
        await semaphore?.acquire();

        try {
          if (process.exitCode != null) return;

          const eachContext = new EachContext({
            isParallel: concurrency !== 1,
            log: { prefix: prefix ? workspace.name : undefined, formatPrefix },
            args,
            opts,
            root,
            workspaces,
            workspace,
            matrixValue,
          });

          destroy.unshift(() => eachContext.destroy());
          await command.each(eachContext);
        } finally {
          semaphore?.release();
        }
      }),
    );

    promises.set(workspace.name, promise);
  }

  await Promise.all(promises.values());

  if (process.exitCode != null) return;

  const afterContext = new AfterContext({ log, args, opts, root, workspaces });

  destroy.unshift(() => afterContext.destroy());
  await command.after(afterContext);
};
