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
      .option('-s, --sequential', 'Run multiple scripts (CSV) sequentially.')
      .passThroughOptions();
  },

  before: async ({ args, opts }) => {
    const [scriptsCsv] = args;
    const { sequential = false } = opts;
    const scripts = scriptsCsv
      .split(',')
      .map((script) => script.trim())
      .filter(Boolean);

    if (sequential) {
      return [{ scripts }];
    }

    return sequential ? [{ scripts }] : scripts.map((script) => ({ scripts: [script] }));
  },

  each: async ({ args, workspace, matrixValue, spawn }) => {
    if (!workspace.selected) return;

    const [, scriptArgs] = args;
    const { scripts } = matrixValue;

    for (const script of scripts) {
      const exitCode = await spawn('npm', ['run', '--if-present', script, '--', ...scriptArgs], {
        echo: true,
        errorReturn: true,
      }).getExitCode();

      if (exitCode !== 0) {
        process.exitCode = exitCode;
        return;
      }
    }
  },
});
