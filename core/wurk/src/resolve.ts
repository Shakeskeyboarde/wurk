import nodePath from 'node:path';

import { createPackageManager } from '@wurk/pm';

export const resolve = async (spec: string, from = '.'): Promise<string> => {
  const dir = nodePath.resolve(from);
  const key = JSON.stringify({ dir, spec });

  let promise = cache.get(key);

  if (!promise) {
    promise = resolveInternal(dir, spec);
    cache.set(key, promise);
  }

  return await promise;
};

const resolveInternal = async (dir: string, spec: string): Promise<string> => {
  const pm = await createPackageManager(dir);
  const { stdoutText: filename } = await pm.spawnNode([
    '--input-type=module',
    `--eval=try{console.log(import.meta.resolve(process.argv[1]));}catch{}`,
    '--',
    spec,
  ]);

  if (!filename) {
    throw new Error(`could not resolve "${spec}" from "${dir}"`);
  }

  return filename;
};

const cache = new Map<string, Promise<string>>();
