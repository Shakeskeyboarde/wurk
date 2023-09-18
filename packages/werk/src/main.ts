import assert from 'node:assert';
import { cpus } from 'node:os';
import { inspect } from 'node:util';

import { loadCommandPlugins } from './command/load-command-plugins.js';
import { runCommand } from './command/run-command.js';
import { createCommander } from './commander/commander.js';
import { loadConfig } from './config.js';
import { onError } from './error.js';
import { type GlobalOptions } from './options.js';
import { Log, log, parseLogLevel } from './utils/log.js';
import { isWorkspaceMatch } from './workspace/get-workspaces.js';

process.on('uncaughtException', onError);
process.on('unhandledRejection', (error) => {
  throw error;
});

export const main = (args = process.argv.slice(2)): void => {
  mainAsync(args).catch(onError);
};

const mainAsync = async (args: string[]): Promise<void> => {
  const recursionDepth = process.env.WERK_RECURSION_DEPTH ? Number(process.env.WERK_RECURSION_DEPTH) : 0;

  if (Number.isNaN(recursionDepth) || recursionDepth >= 3) {
    throw new Error('Werk recursion depth exceeded.');
  }

  process.env.WERK_RECURSION_DEPTH = (recursionDepth + 1).toString(10);

  const globalConfig = await loadConfig();
  const commander = createCommander('werk');
  const commanderConfigured = commander
    .passThroughOptions()
    .allowExcessArguments()
    .allowUnknownOption()
    .allowPartialCommand()
    .description(globalConfig.description)
    .addHelpText('after', 'To get help for a specific command, run `werk <command> --help`.')
    .option(
      '-l, --loglevel <level>',
      'Set the log level (silent, error, warn, notice, info, verbose, silly).',
      parseLogLevel,
    )
    .addOption(
      commander
        .createOption('--log-level <level>', 'Alias for --loglevel.')
        .argParser(parseLogLevel)
        .hideHelp()
        .conflicts('loglevel'),
    )
    .option('-p, --parallel', 'Process workspaces in parallel.')
    .addOption(
      commander
        .createOption('-c, --concurrency <count>', 'Number workspaces to process in parallel (number or "all").')
        .argParser((value) => {
          if (value === 'all') return -1;
          const count = Number(value);
          assert(!Number.isNaN(count), new Error('Concurrency count must be a number or "all".'));
          assert(count > 0, new Error('Concurrency count must be greater than 0.'));
          return count;
        })
        .implies({ parallel: true }),
    )
    .option(
      '-w, --workspace <name>',
      'Include workspaces by name.',
      (value, previous: string[] | undefined): string[] => {
        if (
          !globalConfig.workspacePackages.some((workspace) =>
            isWorkspaceMatch(workspace, globalConfig.rootPackage.dir, value),
          )
        ) {
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
    .option('--include-workspace-root', 'Include the root workspace.')
    .option(
      '--not-workspace <name>',
      'Exclude workspaces by name.',
      (value, previous: string[] | undefined): string[] => {
        if (
          !globalConfig.workspacePackages.some((workspace) =>
            isWorkspaceMatch(workspace, globalConfig.rootPackage.dir, value),
          )
        ) {
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
    .addOption(commander.createOption('--not-public', 'Exclude public workspaces.').conflicts('notPrivate'))
    .option('--not-published', 'Exclude published workspaces.')
    .addOption(commander.createOption('--not-unpublished', 'Exclude unpublished workspaces.').conflicts('notPublished'))
    .option('--not-modified', 'Exclude modified workspaces.')
    .addOption(commander.createOption('--not-unmodified', 'Exclude unmodified workspaces.').conflicts('notModified'))
    .option('--no-dependencies', 'Do not include dependencies when selecting workspaces.')
    .option('--no-wait', 'No waiting for dependency processing to complete.')
    .option('--no-prefix', 'No output prefixes.')
    .option('--git-head <sha>', 'Set a default head commit hash for non-Git environments.')
    .option('--git-from-revision <rev>', 'Set the revision used for detecting modifications.')
    .version(globalConfig.version, '-v, --version', 'Display the current version.');

  const plugins = await loadCommandPlugins(globalConfig, commander);
  const getGlobalOptions = (): GlobalOptions => {
    const opts = commanderConfigured.opts();

    Log.setLevel(opts.loglevel ?? opts.logLevel ?? 'info');

    const globalOpts = {
      log: {
        level: Log.level.name,
        prefix: opts.prefix,
      },
      select: {
        withDependencies: opts.dependencies,
        includeWorkspaces: opts.workspace ?? [],
        includeKeywords: opts.keyword ?? [],
        includeRoot: opts.includeWorkspaceRoot ?? false,
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

    log.silly('config = ' + inspect(globalConfig));
    log.silly('env = ' + inspect(process.env));

    return globalOpts;
  };

  commander.action((_opts, self) => {
    commander.outputHelp({ error: true });

    if (self.args[0] == null) {
      throw new Error('A command is required.');
    }

    throw new Error(`Command "${self.args[0]}" not found. Do you need to install the command plugin package?`);
  });

  plugins.forEach((plugin) => {
    commander.addCommand(
      plugin.commander.action(async () => {
        const globalOpts = getGlobalOptions();

        await runCommand(globalConfig, globalOpts, plugin);
      }),
    );
  });

  await commander.parseAsync([...globalConfig.globalArgs, ...args], { from: 'user' });
};
