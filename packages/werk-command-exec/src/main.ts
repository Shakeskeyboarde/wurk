import { createCommand } from '@werk/cli';

export default createCommand({
  init: ({ commander }) => {
    return commander
      .argument('<executable>', 'An executable to run in each workspace.')
      .argument('[args...]', 'Arguments passed to the executable.')
      .passThroughOptions();
  },

  each: async ({ args, workspace, spawn }) => {
    if (workspace.selected) await spawn(...args, { echo: true, errorThrow: true });
  },
});
