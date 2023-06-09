import { createCommand } from '@werk/cli';

export default createCommand({
  init: ({ commander, command }) => {
    return commander
      .description(command.packageJson.description ?? '')
      .description(
        `If a script is not found in a workspace, a warning will be
        printed, but the command will complete successfully.`,
      )
      .argument('<script>', 'Script to run in each workspace.')
      .argument('[args...]', 'Arguments passed to the script.')
      .passThroughOptions();
  },

  each: async ({ log, args, workspace, spawn }) => {
    if (!workspace.selected) return;

    const [script, scriptArgs] = args;
    const { scripts } = await workspace.readPackageJson();

    if (scripts?.[script] == null) {
      log.verbose(`Skipping script "${script}" because it is not defined in workspace "${workspace.name}".`);
      return;
    }

    const exitCode = await spawn('npm', ['run', script, ...scriptArgs], { echo: true }).getExitCode();

    if (exitCode !== 0) process.exitCode = exitCode;
  },
});
