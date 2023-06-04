import { createCommand } from '@werk/cli';

export default createCommand({
  init: ({ commander }) => {
    return commander
      .description(
        `Run package.json scripts.
      
        If a script is not found in a workspace, a warning will be
        printed, but the command will complete successfully.`,
      )
      .argument('<script>', 'Script to run in each workspace.')
      .argument('[args...]', 'Arguments passed to the script.')
      .passThroughOptions();
  },

  each: async ({ workspace, args, log, spawn }) => {
    if (!workspace.selected) return;

    const pkg = await workspace.readPackageJson();
    const [script, runArgs] = args;

    if (pkg.scripts?.[script] == null) {
      log.warn(`Script "${script}" not found in workspace "${workspace.name}".`);
      return;
    }

    await spawn('npm', ['run', script, ...runArgs], { echo: true });
  },
});
