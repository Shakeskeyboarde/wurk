import nodeAssert from 'node:assert';

import { createCommand } from 'wurk';

export default createCommand('run', {
  config: (cli) => {
    return cli
      .trailer('Scripts are only run if they are present.')
      .option('<script>', 'script to run in each workspace')
      .option('[args...]', 'arguments passed to scripts')
      .option('--delay-each-workspace <seconds>', {
        description: 'delay between each workspace',
        key: 'delaySeconds',
        parse: (value): number => {
          const num = Number(value);
          nodeAssert(num, 'delay must be an integer');
          nodeAssert(num >= 0, 'delay must be a positive integer');
          return num;
        },
      })
      .setUnknownNamedOptionAllowed();
  },

  action: async ({ workspaces, options, pm }) => {
    const { script, args, delaySeconds = 0 } = options;
    const delay = createDelay(delaySeconds);

    await workspaces.forEach(async (workspace) => {
      await delay();

      const { log, config, spawn } = workspace;
      const exists = config.at('scripts')
        .at(script)
        .is('string');

      if (!exists) {
        log.debug`skipping missing script "${script}"`;
        return;
      }

      await spawn(pm, ['run', pm !== 'yarn' && '--', script, args], { stdio: 'echo' });
    });
  },
});

const createDelay = (seconds: number): () => (Promise<void> | undefined) => {
  if (seconds <= 0) return () => undefined;

  let previous: Promise<void> | undefined;

  return () => {
    if (!previous) return previous = Promise.resolve();

    return previous = previous.then(() => {
      return new Promise((resolve) => {
        setTimeout(resolve, seconds * 1000);
      });
    });
  };
};
