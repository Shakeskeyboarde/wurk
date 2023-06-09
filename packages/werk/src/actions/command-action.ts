import { Sema as Semaphore } from 'async-sema';
import chalk from 'chalk';

import { type CommandPlugin } from '../command/load-command-plugin.js';
import { type GlobalOptions } from '../options.js';
import { log } from '../utils/log.js';
import { getWorkspaceDependencyNames } from '../workspace/get-workspace-dependency-names.js';
import { getWorkspaces } from '../workspace/get-workspaces.js';
import { type WorkspaceOptions } from '../workspace/workspace.js';

interface CommandActionOptions {
  readonly rootDir: string;
  readonly workspaces: readonly WorkspaceOptions[];
  readonly args: unknown;
  readonly opts: unknown;
  readonly commandPlugin: CommandPlugin;
  readonly globalOpts: GlobalOptions;
}

type PrefixColor = (typeof PREFIX_COLORS)[number];

const PREFIX_COLORS = ['cyan', 'magenta', 'yellow', 'blue', 'green', 'red'] as const;

export const commandAction = async ({
  rootDir,
  workspaces,
  args,
  opts,
  commandPlugin,
  globalOpts,
}: CommandActionOptions): Promise<void> => {
  workspaces = await getWorkspaces(workspaces, globalOpts.select);

  const { command, ...commandInfo } = commandPlugin;
  await command.before({
    command: commandInfo,
    rootDir,
    args,
    opts,
    workspaces,
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
      if (wait) await prerequisites;
      await semaphore?.acquire();

      try {
        if (process.exitCode != null) return;
        log.notice(`: ${workspace.name}`);
        await command.each({
          log: { prefix: logPrefix, trim: Boolean(logPrefix) },
          command: commandInfo,
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

    promises.set(workspace.name, promise);
  }

  await Promise.all(promises.values());

  if (process.exitCode != null) return;

  await command.after({
    command: commandInfo,
    rootDir,
    args,
    opts,
    workspaces,
    isWorker: false,
    workerData: null,
  });
};
