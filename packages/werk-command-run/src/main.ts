import { createCommand } from '@werk/cli';

export default createCommand({
  init: ({ commander, command }) => {
    return commander
      .description(command.packageJson.description ?? '')
      .description(
        `If a script is not found in a workspace, a warning will be
        printed, but the command will complete successfully.`,
      )
      .description(
        `The script can be a CSV of scripts to run more than one script
        at a time. Arguments are passed only to the last script. The
        scripts are run in parallel if global options allow, and the
        --sequential flag is not set.`,
      )
      .argument('<script>', 'Script (or scripts CSV) to run in each workspace.')
      .argument('[args...]', 'Arguments passed to the script.')
      .option('-s, --sequential', 'Run multiple scripts (CSV) sequentially.')
      .passThroughOptions();
  },

  before: async ({ args, opts }) => {
    const [scriptsCsv, scriptArgs] = args;
    const { sequential = false } = opts;
    const scripts = scriptsCsv.split(',');

    if (sequential) {
      return [{ scripts: scripts.map((script) => script.trim()), scriptArgs }];
    }

    return scripts.map((script, i) => ({
      scripts: [script.trim()],
      scriptArgs: i === scripts.length - 1 ? scriptArgs : [],
    }));
  },

  each: async ({ log, workspace, matrixValue, spawn }) => {
    if (!workspace.selected) return;

    const { scripts, scriptArgs } = matrixValue;
    const { scripts: packageScripts } = await workspace.readPackageJson();

    for (const [i, script] of scripts.entries()) {
      if (packageScripts?.[script] == null) {
        log.verbose(`Skipping script "${script}" because it is not defined in workspace "${workspace.name}".`);
        continue;
      }

      const exitCode = await spawn('npm', ['run', script, ...(i === scripts.length - 1 ? scriptArgs : [])], {
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
