import { createCommand } from '@werk/cli';

export default createCommand({
  init: ({ commander }) => {
    return commander
      .argument('<executable>', 'An executable to run in each workspace.')
      .argument('[args...]', 'Arguments passed to the executable.')
      .passThroughOptions();
  },

  each: async ({ log, isParallel, args, workspace, spawn }) => {
    if (!workspace.selected) return;

    const inheritStreams = !log.prefix && !isParallel;

    await spawn(...args, {
      input: inheritStreams ? 'inherit' : false,
      echo: inheritStreams ? 'inherit' : true,
      errorSetExitCode: true,
      errorReturn: true,
    });
  },
});
