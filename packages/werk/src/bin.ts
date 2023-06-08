#!/usr/bin/env node
import assert from 'node:assert';
import { join } from 'node:path';

import { getNpmWorkspacesRoot } from './npm/get-npm-workspaces-root.js';

await getNpmWorkspacesRoot()
  .then(async (root) => {
    const { main } = await import(join(root, 'node_modules', '@werk/cli', 'lib', 'main.js'));
    assert(typeof main === 'function');
    return main;
  })
  .catch(async () => {
    const { main } = await import('./main.js');
    console.warn('\u001B[2mUsing globally installed Werk.\u001B[22m');
    return main;
  })
  .then((main) => main());
