import { createCommand } from 'wurk';

export default createCommand('exec', {
  config: (cli) => {
    return cli
      .option('<executable>', 'executable to run in each workspace')
      .option('[args...]', 'arguments passed to the executable')
      .setUnknownNamedOptionAllowed();
  },

  action: async ({ workspaces, options }) => {
    await workspaces.forEach(async ({ spawn }) => {
      await spawn(options.executable, options.args, { stdio: 'echo' });
    });
  },
});
