import assert from 'node:assert';
import { cpus } from 'node:os';
import { inspect } from 'node:util';

import { minimatch } from 'minimatch';

import { loadCommandPlugins } from './command/load-command-plugins.js';
import { runCommandPlugin } from './command/run-command-plugin.js';
import { createCommander } from './commander/commander.js';
import { loadConfig } from './config.js';
import { onError } from './error.js';
import { type GlobalOptions, type SelectMatcher } from './options.js';
import { Log, log, parseLogLevel } from './utils/log.js';

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

  process.chdir(globalConfig.rawRootWorkspace.dir);
  process.chdir = () => {
    throw new Error('A command plugin tried to change the working directory. This is not supported.');
  };

  const getMatchers = (
    csv: string,
    values: readonly string[],
    onNoMatch: (pattern: string) => void,
  ): SelectMatcher[] => {
    return csv.split(',').flatMap((value) => {
      value = value.trim();

      const negate = value.startsWith('!');
      const pattern = negate ? value.slice(1).trim() : value;

      if (!pattern) return [];

      // eslint-disable-next-line unicorn/no-array-method-this-argument
      const match = minimatch.filter(pattern, { nonegate: true, matchBase: true });

      if (!values.some(match)) {
        onNoMatch(`${negate ? '!' : ''}${pattern}`);
      }

      return { match, isSelected: !negate, pattern };
    });
  };

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
        .createOption(
          '-c, --concurrency <count>',
          'Number workspaces to process in parallel (<number>, "auto", "all").',
        )
        .argParser((value) => {
          if (value === 'auto') return undefined;
          if (value === 'all') return -1;
          const count = Number(value);
          assert(!Number.isNaN(count), new Error('Concurrency count must be a number, "auto", or "all".'));
          assert(count > 0, new Error('Concurrency count must be greater than 0.'));
          return count;
        })
        .implies({ parallel: true }),
    )
    .option(
      '-w, --workspace <patterns>',
      'Select workspaces by name (glob, csv, repeatable).',
      (value, previous: SelectMatcher[] = []) => {
        const matchers = getMatchers(value, globalConfig.workspaceNames, (pattern) => {
          throw new Error(`Workspace pattern "${pattern}" will never match.`);
        });

        return [...previous, ...matchers];
      },
    )
    .option('--include-root-workspace', 'Include the root workspace in the selection.')
    .option('--no-dependencies', 'Do not automatically include dependencies of selected workspaces.')
    .option('--no-prefix', 'No output prefixes.')
    .option('--git-from-revision <rev>', 'Set the revision used for detecting modifications.')
    .version(globalConfig.version, '-v, --version', 'Display the current version.');

  const plugins = await loadCommandPlugins(globalConfig, commander);
  const getGlobalOptions = (): GlobalOptions => {
    const opts = commanderConfigured.opts();

    Log.setLevel(opts.loglevel ?? opts.logLevel ?? 'info');

    const globalOpts: GlobalOptions = {
      log: {
        level: Log.level.name,
        prefix: opts.prefix,
      },
      select: {
        workspace: opts.workspace ?? [],
        includeRootWorkspace: opts.includeRootWorkspace ?? false,
        dependencies: opts.dependencies,
      },
      run: {
        concurrency: opts.parallel ? opts.concurrency ?? cpus().length + 1 : 1,
      },
      git: {
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

        await runCommandPlugin(globalConfig, globalOpts, plugin);
      }),
    );
  });

  await commander.parseAsync(args, { from: 'user' });
};
