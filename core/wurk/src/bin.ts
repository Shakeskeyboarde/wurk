#!/usr/bin/env node
import path from 'node:path';

import { importRelativeResolve } from '@wurk/import';
import { log } from '@wurk/log';

import type * as MainExports from './main.js';

const { main } = await importRelativeResolve('wurk')
  .then((value) => {
    return import(path.join(value.moduleDir, 'lib/main.js')) as Promise<
      typeof MainExports
    >;
  })
  .catch(() => {
    log.warn`using globally installed Wurk`;
    return import('./main.js');
  });

main();
