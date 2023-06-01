#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Command, InvalidArgumentError } from '@commander-js/extra-typings';
import { Sema as Semaphore } from 'async-sema';
import chalk from 'chalk';

import { abort, AbortError } from './abort.js';
import { CommandContext, loadCommand } from './command.js';
import { Log, log } from './log.js';
import { getNpmWorkspacesRoot } from './npm.js';
import { spawn } from './spawn.js';
import { getWorkspaces, type Workspace } from './workspaces.js';

const onError = (error: unknown): never => {
  if (error instanceof AbortError) {
    if (error.message) log.error(error.message);
    process.exit(process.exitCode ?? error.exitCode);
  } else {
    log.error(error instanceof Error ? error.message : `${error}`);
    process.exit(process.exitCode ?? 1);
  }
};

process.on('unhandledRejection', onError);
process.on('uncaughtException', onError);

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageVersion = JSON.parse(readFileSync(`${__dirname}/../package.json`, 'utf-8')).version;

const program = new Command()
  .configureOutput({
    outputError: (str) => {
      str = str.trim();
      str = str.replace(
        /^error: ([a-z])(.*?)([.!?]?)$/u,
        (_, firstChar: string, rest: string, punctuation: string) =>
          `${firstChar.toUpperCase()}${rest}${punctuation || '.'}`,
      );
      log.error(str);
    },
  })
  .name('monox')
  .description('NPM workspaces CLI.')
  .argument('<command>', 'Command to run.')
  .argument('[options...]', 'Options to pass to the command.')
  .option('-p, --parallel <count>', 'Process workspaces in parallel (0 = unlimited).', (value) => {
    const count = Number(value);
    if (Number.isNaN(count) || count < 0) {
      throw new InvalidArgumentError('Parallel count must be a positive integer or zero.');
    }
    return count;
  })
  .option('-w, --workspace <name>', 'Select workspaces by name.', (value, previous: string[] | undefined): string[] => [
    ...(previous ?? []),
    value,
  ])
  .option(
    '-k, --keyword <keyword>',
    'Select workspaces by keyword.',
    (value, previous: string[] | undefined): string[] => [...(previous ?? []), value],
  )
  .option(
    '--not-keyword <keyword>',
    'Exclude workspaces by keyword.',
    (value, previous: string[] | undefined): string[] => [...(previous ?? []), value],
  )
  .option('--alphabetical', 'Process workspaces alphabetically.')
  .option('--no-private', 'Exclude private workspaces.')
  .option('--no-public', 'Exclude public workspaces.')
  .option('--no-prefix', 'Do not prefix output with workspace name.')
  .version(packageVersion, '-v, --version', 'Output the version number.')
  .helpOption('-h, --help', 'Display help.')
  .showHelpAfterError()
  .addHelpCommand(false)
  .enablePositionalOptions()
  .passThroughOptions()
  .action(async (cmd, args, { parallel = 1, alphabetical = false, prefix, ...filters }) => {
    const { version, description, init, before, each, after } = await loadCommand(cmd);
    const rootDir = await getNpmWorkspacesRoot();

    process.chdir(rootDir);

    const command = new Command(cmd)
      .copyInheritedSettings(program)
      .name(`${program.name()} ${cmd}`)
      .helpOption('-h, --help', 'Display help for this command.');
    const cache = {
      workspacesPromise: undefined as Promise<ReadonlyMap<string, Workspace>> | undefined,
    };
    const getCachedWorkspaces = (): Promise<ReadonlyMap<string, Workspace>> => {
      if (!cache.workspacesPromise) {
        cache.workspacesPromise = getWorkspaces({ filters, alphabetical });
      }

      return cache.workspacesPromise;
    };
    const context = new CommandContext({
      path: rootDir,
      command,
      spawn: (command_, args_, options) => spawn(command_, args_, { cwd: rootDir, ...options }),
      getWorkspaces: getCachedWorkspaces,
    });
    const actions: ((...args: any[]) => void | Promise<void>)[] = [];

    command.action(async (...subcommandArgs) => {
      for (const action of actions) {
        await action(...subcommandArgs);
      }

      await before?.(context);

      if (each) {
        const workspaces = await getCachedWorkspaces();
        const prefixColors = ['cyan', 'magenta', 'yellow', 'blue', 'green', 'red'] as const;
        const semaphore = parallel > 0 ? new Semaphore(parallel) : null;
        const promises = new Map<string, Promise<void>>();
        let prefixColorIndex = 0;

        for (const workspace of workspaces.values()) {
          const prefixColor = prefixColors[prefixColorIndex++ % prefixColors.length] as (typeof prefixColors)[number];
          const workspaceLog = new Log({
            trim: prefix,
            prefix: prefix ? chalk.bold(chalk[`${prefixColor}Bright`](workspace.name) + ': ') : undefined,
          });
          const workspaceContext = new CommandContext({
            path: workspace.path,
            command,
            log: workspaceLog,
            spawn: (command_, args_, options) =>
              spawn(command_, args_, { cwd: workspace.path, log: workspaceLog, ...options }),
            getWorkspaces: getCachedWorkspaces,
          });
          const prerequisites = Promise.allSettled([...workspace.dependencyNames].map((name) => promises.get(name)));
          const promise = Promise.resolve().then(async () => {
            await prerequisites;
            await semaphore?.acquire();

            log.notice(`: ${workspace.name}`);

            try {
              await each(workspace, workspaceContext);
            } finally {
              semaphore?.release();
            }
          });

          if (!alphabetical) promises.set(workspace.name, promise);
        }
      }

      await after?.(context);
    });

    command.action = (action) => {
      actions.push(action);
      return command;
    };

    if (description) command.description(description);
    if (version) command.version(version, '-v, --version', 'Output the version number of this command.');

    init(command, { path: rootDir, log, abort });
    await command.parseAsync(args, { from: 'user' });
  });

await program.parseAsync();
