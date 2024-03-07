#!/usr/bin/env node
import path from 'node:path';

import { importRelativeResolve } from '@wurk/import';
import { log } from '@wurk/log';

import type * as MainExports from './main.js';

const { main } = await importRelativeResolve('wurk').then(
  async (value): Promise<typeof MainExports> => {
    if (value?.dir != null) {
      return await import(path.join(value.dir, 'lib/main.js'));
    }

    log.warn`using globally installed Wurk`;
    return await import('./main.js');
  },
);

main();
