import { createCommand } from 'wurk';

export default createCommand('run', {
  config: (cli) => {
    return cli
      .trailer('Scripts are only run if they are present.')
      .option('<script>', 'script to run in each workspace')
      .option('[args...]', 'arguments passed to scripts')
      .setUnknownNamedOptionAllowed();
  },

  action: async ({ workspaces, options, pm }) => {
    const { script, args } = options;

    await workspaces.forEach(async (workspace) => {
      const { log, config, spawn } = workspace;
      const exists = config.at('scripts')
        .at(script)
        .is('string');

      if (!exists) {
        log.debug`skipping missing script "${script}"`;
        return;
      }

      await spawn(pm.command, ['run', '--', script, args], { stdio: 'echo' });
    });
  },
});
