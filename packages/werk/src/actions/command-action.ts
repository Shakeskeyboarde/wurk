import { Sema as Semaphore } from 'async-sema';
import chalk from 'chalk';

import { type LoadedCommand } from '../command/load-command.js';
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
  readonly command: LoadedCommand;
  readonly globalOptions: GlobalOptions;
}

type PrefixColor = (typeof PREFIX_COLORS)[number];

const PREFIX_COLORS = ['cyan', 'magenta', 'yellow', 'blue', 'green', 'red'] as const;

export const commandAction = async ({
  rootDir,
  workspaces,
  args,
  opts,
  command,
  globalOptions,
}: CommandActionOptions): Promise<void> => {
  workspaces = await getWorkspaces(workspaces, globalOptions.select);

  await command.instance.before({
    command: command.package,
    rootDir,
    args,
    opts,
    workspaces,
    isWorker: false,
    workerData: null,
  });

  const { parallel, concurrency, wait } = globalOptions.run;
  const { prefix } = globalOptions.log;
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
        await command.instance.each({
          log: { prefix: logPrefix, trim: Boolean(logPrefix) },
          command: command.package,
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

    if (wait) promises.set(workspace.name, promise);
  }

  await command.instance.after({
    command: command.package,
    rootDir,
    args,
    opts,
    workspaces,
    isWorker: false,
    workerData: null,
  });
};
