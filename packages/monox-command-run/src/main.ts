import { createCommand } from 'monox';

export default createCommand({
  description: 'Run a package.json script in each workspace. Missing scripts are ignored.',

  init: (command) => {
    return command
      .argument('<script>', 'Script to run in each workspace.')
      .argument('[args...]', 'Arguments passed to the script.')
      .passThroughOptions();
  },

  each: async (workspace, { log, spawn, args: [script, args] }) => {
    if (!workspace.selected) return;

    const pkg = await workspace.readPackageJson();

    if (pkg.scripts?.[script] == null) {
      log.warn(`Script "${script}" not found in workspace "${workspace.name}".`);
      return;
    }

    await spawn('npm', ['run', script, ...args], { echo: true });
  },
});
