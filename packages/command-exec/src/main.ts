import { createCommand } from '@werk/cli';

export default createCommand({
  config: (commander) => {
    return commander
      .argument('<executable>', 'An executable to run in each workspace.')
      .argument('[args...]', 'Arguments passed to the executable.')
      .passThroughOptions()
      .allowUnknownOption();
  },

  each: async ({ log, isParallel, args, workspace, spawn }) => {
    if (!workspace.selected) return;

    const inheritStreams = !log.prefix && !isParallel;

    await spawn(...args, {
      cwd: workspace.dir,
      input: inheritStreams ? 'inherit' : false,
      echo: inheritStreams ? 'inherit' : true,
      errorSetExitCode: true,
      errorReturn: true,
    });
  },
});
