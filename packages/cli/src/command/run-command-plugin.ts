import { Sema as Semaphore } from 'async-sema';
import chalk from 'chalk';

import { type Config } from '../config.js';
import { AfterContext } from '../context/after-context.js';
import { BeforeContext } from '../context/before-context.js';
import { CleanupContext } from '../context/cleanup-context.js';
import { EachContext } from '../context/each-context.js';
import { type GlobalOptions } from '../options.js';
import { log, LogLevel } from '../utils/log.js';
import { createWorkspaces } from '../workspace/create-workspaces.js';
import { WorkspaceStatus } from '../workspace/workspace.js';
import { type CommandPlugin } from './load-command-plugins.js';

type PrefixColor = (typeof PREFIX_COLORS)[number];

const PREFIX_COLORS = ['cyan', 'magenta', 'yellow', 'blue', 'green', 'red'] as const;

export const runCommandPlugin = async (
  globalConfig: Config,
  globalOpts: GlobalOptions,
  plugin: CommandPlugin,
): Promise<void> => {
  let isAborted = false;
  let isWaitingEnabled = true;
  let isPrintSummaryEnabled = false;

  const destroy: (() => void)[] = [];
  const { command, commander, commandName } = plugin;
  const args = commander.processedArgs;
  const opts = commander.opts();
  const { rawRootWorkspace, rawWorkspaces } = globalConfig;
  const { log: logOptions, git, select, run } = globalOpts;
  const isMonorepo = rawWorkspaces.length > 1;
  const { gitFromRevision } = git;
  const workspaceMatchers = [...select.workspace].reverse();
  const statuses = new Map<string, { status: WorkspaceStatus; detail: string | undefined }>();

  const [root, workspaces] = createWorkspaces({
    rawRootWorkspace: rawRootWorkspace,
    rawWorkspaces: rawWorkspaces,
    includeRootWorkspace: select.includeRootWorkspace,
    gitFromRevision: gitFromRevision,
    onStatus: (name, status, detail) => statuses.set(name, { status, detail }),
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

  workspaces.forEach((workspace) => {
    statuses.set(workspace.name, {
      status: WorkspaceStatus.skipped,
      detail: undefined,
    });
  });

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
    log.flush();

    const statusOverall: WorkspaceStatus = Array.from(statuses.values()).reduce<WorkspaceStatus>(
      (result, { status }) => {
        return status > result ? status : result;
      },
      WorkspaceStatus.skipped,
    );

    if (statusOverall >= WorkspaceStatus.failure) {
      process.exitCode ||= 1;
    }

    if (isPrintSummaryEnabled && statuses.size) {
      let statusLogLevel: LogLevel = LogLevel.notice;
      const isVerbose = log.isLevel('verbose');
      const statusMessages = Array.from(statuses.entries())
        .flatMap(([key, value]): string[] => {
          const workspace = workspaces.get(key);

          if (!workspace?.isSelected && !isVerbose) return [];

          let statusMessage: string;

          switch (value.status) {
            case WorkspaceStatus.skipped:
              statusMessage = chalk.dim('skipped');
              break;
            case WorkspaceStatus.success:
              statusMessage = chalk.greenBright('success');
              break;
            case WorkspaceStatus.warning:
              statusMessage = chalk.yellowBright('warning');
              statusLogLevel = LogLevel.warn;
              break;
            case WorkspaceStatus.pending:
            case WorkspaceStatus.failure:
              statusMessage = chalk.redBright('failure');
              statusLogLevel = LogLevel.error;
              break;
          }

          return [`\n  ${key}: ${statusMessage}${value.detail ? chalk.dim(` (${value.detail})`) : ''}`];
        })
        .join('');

      if (log.isLevel(statusLogLevel)) {
        log.printErr(`${commandName} summary:${statusMessages}`);
      }
    }

    if (!isAborted) {
      if (process.exitCode) {
        log.error(`${commandName} failure.`);
      } else {
        log.success(`${commandName} success.`);
      }
    }

    log.flush();
  });

  ['uncaughtException', 'unhandledRejection', 'SIGINT', 'SIGTERM', 'SIGUSR1', 'SIGUSR2'].forEach((event) => {
    process.on(event, () => {
      if ((event === 'SIGINT' || event === 'SIGTERM') && !process.exitCode) {
        isAborted = true;
      }

      process.exit(process.exitCode || 1);
    });
  });

  const beforeContext = new BeforeContext({
    log: undefined,
    args,
    opts,
    root,
    workspaces,
    onWaitForDependencies: (enabled) => (isWaitingEnabled = enabled),
    onPrintSummary: (enabled) => (isPrintSummaryEnabled = enabled),
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
        } catch (error) {
          const status = statuses.get(workspace.name);

          if (status?.status !== WorkspaceStatus.failure) {
            statuses.set(workspace.name, {
              status: WorkspaceStatus.failure,
              detail: status?.status === WorkspaceStatus.pending ? status.detail : undefined,
            });
          }

          throw error;
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
