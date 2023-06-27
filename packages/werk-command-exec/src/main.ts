import { createCommand } from '@werk/cli';

export default createCommand({
  packageManager: ['npm'],

  init: ({ commander }) => {
    return commander
      .argument('<executable>', 'An executable to run in each workspace.')
      .argument('[args...]', 'Arguments passed to the executable.')
      .passThroughOptions();
  },

  each: async ({ args, workspace, spawn }) => {
    if (!workspace.selected) return;

    const exitCode = await spawn(...args, { echo: true, errorReturn: true }).getExitCode();

    if (exitCode !== 0) process.exitCode = exitCode;
  },
});
