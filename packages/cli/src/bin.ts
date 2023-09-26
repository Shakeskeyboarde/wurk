#!/usr/bin/env node
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const findRoot = async (current = process.cwd()): Promise<string> => {
  return await readFile(resolve(current, 'package.json'), 'utf-8')
    .then<Record<string, any>>(JSON.parse)
    .catch(() => undefined)
    .then((packageJson) => {
      if (packageJson?.workspaces) return current;
      const parent = dirname(current);
      if (parent === current) throw new Error('Could not find root workspace.');
      return findRoot(parent);
    });
};

await findRoot()
  .then(async (rootDir) => {
    const { main } = await import(resolve(rootDir, 'node_modules', '@werk/cli', 'lib', 'main.js'));
    assert(typeof main === 'function');
    return main;
  })
  .catch(async () => {
    const { main } = await import('./main.js');
    console.warn('\u001B[2mUsing globally installed Werk.\u001B[22m');
    return main;
  })
  .then((main) => main());
