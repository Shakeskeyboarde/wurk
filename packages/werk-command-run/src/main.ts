import { createCommand } from '@werk/cli';

export default createCommand({
  init: (context) => {
    return context.commander
      .description(
        `Run package.json scripts.
      
        If a script is not found in a workspace, a warning will be
        printed, but the command will complete successfully.`,
      )
      .argument('<script>', 'Script to run in each workspace.')
      .argument('[args...]', 'Arguments passed to the script.')
      .passThroughOptions();
  },

  each: async (context) => {
    if (!context.workspace.selected) return;

    const [script, runArgs] = context.args;
    const { scripts } = await context.workspace.readPackageJson();

    if (scripts?.[script] == null) {
      context.log.warn(`Script "${script}" not found in workspace "${context.workspace.name}".`);
      return;
    }

    await context.spawn('npm', ['run', script, ...runArgs], { echo: true });
  },
});
