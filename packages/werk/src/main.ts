import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { cpus } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Option } from '@commander-js/extra-typings';

import { mainAction } from './actions/main-action.js';
import { Commander } from './commander/commander.js';
import { onError } from './error.js';
import { type GlobalOptions } from './options.js';
import { LOG_LEVEL, type LogLevel } from './utils/log.js';

process.env.WERK_LOG_LEVEL = process.env.WERK_LOG_LEVEL ?? 'info';
process.on('uncaughtException', onError);
process.on('unhandledRejection', (error) => {
  throw error;
});

export const main = (): void => {
  asyncMain().catch(onError);
};

const asyncMain = async (): Promise<void> => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const version = await readFile(join(__dirname, '../package.json'), 'utf-8').then((json) => JSON.parse(json).version);
  const commander = new Commander('werk')
    .description('Modular and extensible monorepo command framework.')
    .addHelpText('after', 'To get help for a specific command, run `werk <command> --help`.')
    .argument('<command>', 'Command to run.')
    .argument('[options...]', 'Options to pass to the command.')
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
    .version(version)
    .passThroughOptions()
    .action(async (cmd, cmdArgs, options) => {
      process.env.WERK_LOG_LEVEL = commander.opts().logLevel ?? process.env.WERK_LOG_LEVEL;
      const globalOpts: GlobalOptions = {
        log: { level: options.logLevel ?? 'info', prefix: options.prefix },
        select: {
          withDependencies: options.withDependencies ?? false,
          includeWorkspaces: options.workspace ?? [],
          includeKeywords: options.keyword ?? [],
          excludeWorkspaces: options.notWorkspace ?? [],
          excludeKeywords: options.notKeyword ?? [],
          excludePrivate: options.notPrivate ?? false,
          excludePublic: options.notPublic ?? false,
          excludePublished: options.notPublished ?? false,
          excludeUnpublished: options.notUnpublished ?? false,
          excludeModified: options.notModified ?? false,
          excludeUnmodified: options.notUnmodified ?? false,
        },
        run: {
          parallel: options.parallel ?? false,
          concurrency: options.concurrency,
          wait: options.wait,
        },
      };

      await mainAction({ commander, cmd, cmdArgs, globalOpts: globalOpts });
    });

  await commander.parseAsync().catch(onError);
};
