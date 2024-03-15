#!/usr/bin/env node
import { log } from '@wurk/log';
import { createPackageManager } from '@wurk/pm';

interface MainExports {
  main: () => Promise<void>;
}

const { main }: MainExports = await createPackageManager()
  .catch((error: unknown) => {
    log.error({ message: error });
    process.exit(1);
  })
  .then((pm) => {
    if (!pm.rootConfig.exists()) log.warn`no workspaces root found`;
    return pm.resolve('wurk/main');
  })
  .then((resolved): Promise<MainExports> => {
    log.debug`using local Wurk installation at "${resolved}"`;
    return import(resolved);
  })
  .catch(() => {
    log.warn('using global Wurk installation');
    return import('./main.js');
  });

await main();
