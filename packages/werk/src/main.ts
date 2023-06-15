import assert from 'node:assert';
import { cpus } from 'node:os';

import { Option } from '@commander-js/extra-typings';

import { Commander } from './commander/commander.js';
import { loadConfig } from './config.js';
import { onError } from './error.js';
import { mainAction } from './main-action.js';
import { type GlobalOptions } from './options.js';
import { LOG_LEVEL, type LogLevel } from './utils/log.js';

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
    .argument('<command>', 'Command to run.')
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
    .option('-c, --concurrency <count>', 'Number of concurrent workspaces (number or "auto").', (value) => {
      if (value === 'auto') return cpus().length + 1;
      const count = Number(value);
      assert(!Number.isNaN(count), new Error('Concurrency count must be a number or "auto".'));
      assert(count > 0, new Error('Concurrency count must be greater than 0.'));
      return count;
    })
    .option('-d, --with-dependencies', 'Always include dependencies when selecting workspaces.')
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
      '--not-workspace <name>',
      'Exclude workspaces by name.',
      (value, previous: string[] | undefined): string[] => [...(previous ?? []), value],
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
    .option('--git-head <sha>', 'Set the commit hash used as the current Git head.')
    .option('--git-from-revision <rev>', 'Set the revision used for detecting modifications.')
    .version(config.version)
    .passThroughOptions();

  commander.parse([...config.globalArgs, ...process.argv.slice(2)], { from: 'user' });

  let [cmd, cmdArgs] = commander.processedArgs;

  commander.parse(
    [
      ...config.globalArgs,
      ...(config.commandConfig[cmd]?.globalArgs ?? []),
      ...process.argv.slice(2, -cmdArgs.length - 1),
      cmd,
      ...(config.commandConfig[cmd]?.args ?? []),
      ...cmdArgs,
    ],
    { from: 'user' },
  );

  [cmd, cmdArgs] = commander.processedArgs;

  const opts = commander.opts();

  const globalOpts: GlobalOptions = {
    log: {
      level: opts.logLevel
        ? opts.logLevel
        : process.env.WERK_LOG_LEVEL && process.env.WERK_LOG_LEVEL in LOG_LEVEL
        ? (process.env.WERK_LOG_LEVEL as LogLevel)
        : 'info',
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
      parallel: opts.parallel ?? false,
      concurrency: opts.concurrency,
      wait: opts.wait,
    },
    git: {
      gitHead: opts.gitHead,
      gitFromRevision: opts.gitFromRevision,
    },
  };

  process.env.WERK_LOG_LEVEL = globalOpts.log.level;

  await mainAction({ config, commander, cmd, cmdArgs, globalOpts });
};
