import { createCommand } from '@werk/cli';

export default createCommand({
  init: ({ commander }) => {
    // See the CommanderJS documentation for more information.
    return commander.argument('<foo>', 'An argument.').option('-b, --bar <value>', 'An option.');
  },

  before: async ({ log, args, opts }) => {
    log.info(`foo: ${args[0]}`);
    log.info(`bar: ${opts.bar}`);
  },
});
