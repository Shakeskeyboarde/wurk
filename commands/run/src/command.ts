import { createCommand, type Workspace } from 'wurk';

export default createCommand('run', {
  config: (cli) => {
    return cli
      .trailer('Scripts are only run if they are present.')
      .trailer(
        `The script can be a CSV of scripts to run more than one script
        at a time. Extra arguments are passed to ALL scripts. The
        scripts are run in parallel if global options allow, and the
        --sequential flag is not set.`,
      )
      .option('<script>', {
        description: 'script (or scripts CSV) to run in each workspace',
        key: 'scriptsCsv',
      })
      .option('[args...]', 'arguments passed to scripts')
      .setGreedy()
      .setUnknownNamedOptionAllowed();
  },

  action: async ({ workspaces, options }) => {
    const scripts = options.scriptsCsv
      .split(/\s*,\s*/u)
      .filter(Boolean);

    if (scripts.length === 0) return;

    if (scripts[0] === 'start' && scripts.length === 1) {
      // If the start script is run by itself, it should generally be run
      // in all workspaces simultaneously.
      await workspaces.forEachParallel((workspace) => {
        return runWorkspaceScripts(workspace, scripts, options.args);
      });
    }
    else {
      await workspaces.forEach((workspace) => {
        return runWorkspaceScripts(workspace, scripts, options.args);
      });
    }
  },
});

const runWorkspaceScripts = async (
  workspace: Workspace,
  scripts: string[],
  args: readonly string[] = [],
): Promise<void> => {
  const { log, config, spawn } = workspace;
  const scriptsJson = config.at('scripts');

  for (const script of scripts) {
    if (!scriptsJson
      .at(script)
      .is('string')) {
      log.debug`skipping missing script "${script}"`;
      continue;
    }

    await spawn(
      'npm',
      ['run', script, ...(args.length ? ['--', ...args] : [])],
      { output: 'echo' },
    );
  }
};
