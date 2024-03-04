#!/usr/bin/env node
import { importRelative } from '@wurk/import';

import type * as MainExports from './main.js';

const { main } = await importRelative<typeof MainExports>('wurk/main')
  .then((value) => value.moduleExports)
  .catch(() => import('./main.js'));

main();
