import { createCommand } from '@werk/cli';

export default createCommand({
  init: (context) => {
    return context.commander
      .description(`Run arbitrary executables in workspaces.`)
      .argument('<executable>', 'An executable to run in each workspace.')
      .argument('[args...]', 'Arguments passed to the executable.')
      .passThroughOptions();
  },

  each: async (context) => {
    if (!context.workspace.selected) return;

    const [executable, executableArgs] = context.args;

    await context.spawn(executable, executableArgs, { echo: true });
  },
});
