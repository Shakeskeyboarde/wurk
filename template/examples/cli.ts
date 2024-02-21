import { createCommand } from 'wurk';

export default createCommand('cli-example', {
  config: (cli) => {
    return cli.option('<foo>', 'an argument').option('-b, --bar <value>', 'an option');
  },

  run: async ({ log, options }) => {
    log.info(`foo: ${options.foo}`);
    log.info(`bar: ${options.bar}`);
  },
});
