#!/usr/bin/env node
import { log } from '@wurk/log';
import { createPackageManager } from '@wurk/pm';

interface MainExports {
  main: () => Promise<void>;
}

const pm = await createPackageManager();
const { main }: MainExports = await pm.resolve('wurk/main')
  .then(async (resolved): Promise<MainExports> => {
    log.debug(`using local Wurk installation at "${resolved}"`);
    return await import(resolved);
  })
  .catch(() => {
    log.warn('using global Wurk installation');
    return import('./main.js');
  });

await main();
