import { createCommand } from '@werk/cli';

export default createCommand({
  init: ({ commander, command }) => {
    return commander
      .description(command.packageJson.description ?? '')
      .description('Scripts are only run if they are present.')
      .description(
        `The script can be a CSV of scripts to run more than one script
        at a time. Extra arguments are passed to ALL scripts. The
        scripts are run in parallel if global options allow, and the
        --sequential flag is not set.`,
      )
      .argument('<script>', 'Script (or scripts CSV) to run in each workspace.')
      .argument('[args...]', 'Arguments passed to scripts.')
      .passThroughOptions();
  },

  each: async ({ log, isParallel, args, workspace, spawn }) => {
    if (!workspace.selected) return;

    const [scriptsCsv, scriptArgs] = args;
    const scripts = scriptsCsv
      .split(',')
      .map((script) => script.trim())
      .filter(Boolean);

    for (const script of scripts) {
      await spawn('npm', ['run', '--if-present', script, '--', ...scriptArgs], {
        input: log.prefix || isParallel ? false : 'inherit',
        echo: true,
        errorSetExitCode: true,
        errorReturn: true,
      });

      if (process.exitCode) return;
    }
  },
});
