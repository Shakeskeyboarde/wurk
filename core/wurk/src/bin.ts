#!/usr/bin/env node
import { log } from '@wurk/log';

import { resolve } from './resolve.js';

const filename = await resolve('wurk/main').catch(() => {
  log.warn('using global Wurk installation');
  return './main.js';
});

await import(filename);
