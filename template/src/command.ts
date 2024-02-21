import { createCommand } from 'wurk';

export default createCommand('template', {
  config: (cli) => {
    // TODO: Configure the command line interface.
    return cli;
  },

  run: async (context) => {
    // TODO: Implement the command.
    context;
  },
});
