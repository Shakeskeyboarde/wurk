import assert from 'node:assert';
import { cpus } from 'node:os';
import { inspect } from 'node:util';

import { Option } from '@commander-js/extra-typings';

import { Commander } from './commander/commander.js';
import { loadConfig } from './config.js';
import { onError } from './error.js';
import { mainAction } from './main-action.js';
import { type GlobalOptions } from './options.js';
import { Log, log, LOG_LEVEL, type LogLevel } from './utils/log.js';
import { isWorkspaceMatch } from './workspace/get-workspaces.js';

process.on('uncaughtException', onError);
process.on('unhandledRejection', (error) => {
  throw error;
});

export const main = (): void => {
  asyncMain().catch(onError);
};

const asyncMain = async (): Promise<void> => {
  const config = await loadConfig();

  const commander = new Commander('werk')
    .description(config.description)
    .addHelpText('after', 'To get help for a specific command, run `werk <command> --help`.')
    .argument('<command>', 'Command to run.', (value) => value.toLocaleLowerCase())
    .argument('[args...]', 'Arguments to pass to the command.')
    .option(
      '-l, --log-level <level>',
      'Set the log level (silent, error, warn, notice, info, verbose, silly).',
      (value): LogLevel => {
        assert(value in LOG_LEVEL, new Error(`Log level must be one of: ${Object.keys(LOG_LEVEL).join(', ')}.`));
        return value as LogLevel;
      },
    )
    .option('-p, --parallel', 'Process workspaces in parallel.')
    .addOption(
      new Option('-c, --concurrency <count>', 'Number workspaces to process in parallel (number or "all").')
        .argParser((value) => {
          if (value === 'all') return -1;
          const count = Number(value);
          assert(!Number.isNaN(count), new Error('Concurrency count must be a number or "all".'));
          assert(count > 0, new Error('Concurrency count must be greater than 0.'));
          return count;
        })
        .implies({ parallel: true }),
    )
    .option('-d, --with-dependencies', 'Always include dependencies when selecting workspaces.')
    .option(
      '-w, --workspace <name>',
      'Include workspaces by name.',
      (value, previous: string[] | undefined): string[] => {
        if (!config.workspaces.some((workspace) => isWorkspaceMatch(workspace, config.rootDir, value))) {
          throw new Error(`Workspace "${value}" does not exist.`);
        }

        return [...(previous ?? []), value];
      },
    )
    .option(
      '-k, --keyword <keyword>',
      'Include workspaces by keyword.',
      (value, previous: string[] | undefined): string[] => [...(previous ?? []), value],
    )
    .option(
      '--not-workspace <name>',
      'Exclude workspaces by name.',
      (value, previous: string[] | undefined): string[] => {
        if (!config.workspaces.some((workspace) => isWorkspaceMatch(workspace, config.rootDir, value))) {
          throw new Error(`Workspace "${value}" does not exist.`);
        }

        return [...(previous ?? []), value];
      },
    )
    .option(
      '--not-keyword <keyword>',
      'Exclude workspaces by keyword.',
      (value, previous: string[] | undefined): string[] => [...(previous ?? []), value],
    )
    .option('--not-private', 'Exclude private workspaces.')
    .addOption(new Option('--not-public', 'Exclude public workspaces.').conflicts('notPrivate'))
    .option('--not-published', 'Exclude published workspaces.')
    .addOption(new Option('--not-unpublished', 'Exclude unpublished workspaces.').conflicts('notPublished'))
    .option('--not-modified', 'Exclude modified workspaces.')
    .addOption(new Option('--not-unmodified', 'Exclude unmodified workspaces.').conflicts('notModified'))
    .option('--no-wait', 'No waiting for dependency processing to complete.')
    .option('--no-prefix', 'No output prefixes.')
    .option('--git-head <sha>', 'Set a default head commit hash for non-Git environments.')
    .option('--git-from-revision <rev>', 'Set the revision used for detecting modifications.')
    .version(config.version)
    .passThroughOptions();

  commander.parse([...config.globalArgs, ...process.argv.slice(2)], { from: 'user' });

  let [cmd, cmdArgs] = commander.processedArgs;

  commander.parse(
    [
      ...config.globalArgs,
      ...(config.commandConfigs[cmd]?.globalArgs ?? []),
      ...process.argv.slice(2, -cmdArgs.length - 1),
      cmd,
      ...(config.commandConfigs[cmd]?.args ?? []),
      ...cmdArgs,
    ],
    { from: 'user' },
  );

  [cmd, cmdArgs] = commander.processedArgs;

  const opts = commander.opts();

  if (opts.logLevel) Log.setLevel(opts.logLevel);

  const globalOpts: GlobalOptions = {
    log: {
      level: Log.level.name,
      prefix: opts.prefix,
    },
    select: {
      withDependencies: opts.withDependencies ?? false,
      includeWorkspaces: opts.workspace ?? [],
      includeKeywords: opts.keyword ?? [],
      excludeWorkspaces: opts.notWorkspace ?? [],
      excludeKeywords: opts.notKeyword ?? [],
      excludePrivate: opts.notPrivate ?? false,
      excludePublic: opts.notPublic ?? false,
      excludePublished: opts.notPublished ?? false,
      excludeUnpublished: opts.notUnpublished ?? false,
      excludeModified: opts.notModified ?? false,
      excludeUnmodified: opts.notUnmodified ?? false,
    },
    run: {
      concurrency: opts.parallel ? opts.concurrency ?? cpus().length + 1 : 1,
      wait: opts.wait,
    },
    git: {
      gitHead: opts.gitHead,
      gitFromRevision: opts.gitFromRevision,
    },
  };

  log.silly('config = ' + inspect(config));
  log.silly('args = ' + inspect({ cmd, cmdArgs, globalOpts }));
  log.silly('env = ' + inspect(process.env));

  await mainAction({ config, commander, cmd, cmdArgs, cmdConfig: config.commandConfigs[cmd], globalOpts });
};
