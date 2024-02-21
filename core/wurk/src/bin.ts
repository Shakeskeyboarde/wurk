#!/usr/bin/env node
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { JsonAccessor } from '@wurk/json';

const findRoot = async (current = process.cwd()): Promise<string> => {
  return await readFile(resolve(current, 'package.json'), 'utf-8')
    .then(JsonAccessor.parse)
    .then((config) => {
      if (config.at('workspaces').is('array')) return current;
      const parent = dirname(current);
      if (parent === current) process.cwd();
      return findRoot(parent);
    });
};

await findRoot()
  .then(async (rootDir): Promise<() => void> => {
    const { main } = await import(resolve(rootDir, 'node_modules', 'wurk', 'lib', 'main.js'));
    assert(typeof main === 'function');
    return main;
  })
  .catch(async () => {
    const { main } = await import('./main.js');
    console.warn('\u001B[2mUsing globally installed Wurk.\u001B[22m');
    return main;
  })
  .then((main) => main());