import { createCommand } from '@werk/cli';

export default createCommand({
  config: (commander) => {
    return commander
      .addHelpText('after', 'Scripts are only run if they are present.')
      .addHelpText(
        'after',
        `The script can be a CSV of scripts to run more than one script
        at a time. Extra arguments are passed to ALL scripts. The
        scripts are run in parallel if global options allow, and the
        --sequential flag is not set.`,
      )
      .argument('<script>', 'Script (or scripts CSV) to run in each workspace.')
      .argument('[args...]', 'Arguments passed to scripts.')
      .passThroughOptions()
      .allowUnknownOption();
  },

  before: async ({ args, setWaitForDependencies }) => {
    const [scripts] = args;

    if (scripts === 'start') {
      /*
       * The start script is special, in that it should generally be run
       * in all workspaces simultaneously, regardless of workspace
       * interdependency.
       */
      setWaitForDependencies(false);
    }
  },

  each: async ({ log, isParallel, args, workspace, spawn }) => {
    if (!workspace.isSelected) return;

    const inheritStreams = !log.prefix && !isParallel;
    const [scriptsCsv, scriptArgs] = args;
    const scripts = scriptsCsv
      .split(',')
      .map((script) => script.trim())
      .filter(Boolean);

    for (const script of scripts) {
      await spawn(
        'npm',
        [!workspace.isRoot && ['-w', workspace.name], 'run', '--if-present', script, '--', ...scriptArgs],
        {
          input: inheritStreams ? 'inherit' : false,
          echo: inheritStreams ? 'inherit' : true,
          errorSetExitCode: true,
          errorReturn: true,
        },
      );

      if (process.exitCode) return;
    }
  },
});
