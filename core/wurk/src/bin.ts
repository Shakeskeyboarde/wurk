#!/usr/bin/env node
import { log } from '@wurk/log';
import { createPackageManager } from '@wurk/pm';

interface MainExports {
  main: () => Promise<void>;
}

const boot: () => Promise<void> = await createPackageManager()
  .catch((error: unknown) => {
    // Creating a package manager _shouldn't_ fail. It should return the NPM
    // default if it can't otherwise detect a package manager. But, if it does
    // fail, we should stop immediately and report the error.
    log.error({ message: error });
    process.exit(1);
  })
  .then(async (pm) => {
    if (!pm.rootConfig.exists()) log.warn`no workspaces root found`;

    // This will throw if work/main cannot be resolved relative to the
    // workspaces root directory.
    const resolved = await pm.resolve('wurk/main');

    log.debug`using local Wurk installation at "${resolved}"`;

    return async () => {
      try {
        const { main } = await import(resolved) as MainExports;
        await main();
        return;
      }
      catch (error: any) {
        // XXX: Yarn is a special case because its PnP implementation uses a
        // custom loader. The global Wurk installation will not have Yarn's
        // custom loader, so the above import will fail if Wurk was called
        // globally. In that case, we can try running a Yarn Node process to
        // import the main module.
        if (error.code === 'ERR_MODULE_NOT_FOUND' && pm.command === 'yarn') {
          await pm.spawnNode([
            '--input-type=module',
            `--eval=
              const { main } = await import(process.argv[1]);
              await main();
            `,
            '--',
            resolved,
            process.argv.slice(2),
          ], { stdio: 'inherit', logCommand: false });
        }
        else {
          throw error;
        }
      }
    };
  })
  .catch((error: unknown) => {
    log.debug({ message: error });
    log.warn('using global Wurk installation');

    return async () => {
      const { main } = await import('./main.js');
      await main();
    };
  });

await boot();
