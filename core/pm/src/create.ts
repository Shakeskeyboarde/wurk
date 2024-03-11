import nodeFs from 'node:fs/promises';
import nodePath from 'node:path';

import { JsonAccessor } from '@wurk/json';

import { Npm } from './implementations/npm.js';
import { Pnpm } from './implementations/pnpm.js';
import { Yarn } from './implementations/yarn.js';
import { YarnClassic } from './implementations/yarn-classic.js';
import { type PackageManager } from './pm.js';

export const createPackageManager = async (dir = '.'): Promise<PackageManager> => {
  const cacheKey = nodePath.resolve(dir);

  let promise = cache.get(cacheKey);

  if (!promise) {
    promise = getPromise(dir)
      .then((pm) => {
        if (pm) return pm;

        const parentDir = nodePath.dirname(dir);
        return parentDir === dir ? null : getPromise(parentDir);
      });

    cache.set(dir, promise);
  }

  const pm = await promise;

  if (!pm) {
    throw new Error(`could not determine package manager at "${dir}"`);
  }

  return pm;
};

const getPromise = async (rootDir: string): Promise<PackageManager | null> => {
  const configFilename = nodePath.resolve(rootDir, 'package.json');
  const config = await nodeFs.readFile(configFilename, 'utf8')
    .then(JsonAccessor.parse);
  const packageManager = config
    .at('packageManager')
    .as('string');

  // There's a "packageManager" field in the "package.json" file, so this is
  // a root.
  if (packageManager != null) {
    const match = /^([^@]+)(?:@(.+)$)?/u.exec(packageManager);

    // The field value doesn't even loosely match the expected format.
    if (!match) {
      throw new Error(`invalid package manager "${packageManager}" in "${configFilename}"`);
    }

    const [id = '', version = '*'] = match.slice(1);

    switch (id) {
      case 'npm':
        return new Npm({ rootDir });
      case 'pnpm':
        return new Pnpm({ rootDir });
      case 'yarn':
        return version.startsWith('1.')
          ? new YarnClassic({ rootDir })
          : new Yarn({ rootDir });
      default:
        throw new Error(`unsupported package manager "${id}" in "${configFilename}`);
    }
  }

  // There's a "workspaces" field in the `package.json` file, so this is is
  // a non-PNPM root.
  if (config
    .at('workspaces')
    .exists()) {
    const yarnLockFilename = nodePath.resolve(rootDir, 'yarn.lock');
    const yarnLock = await nodeFs.readFile(yarnLockFilename, 'utf8')
      .catch((error: any) => {
        if (error?.code === 'ENOENT') return null;
        throw error;
      });

    // There's a yarn.lock file so this is a Yarn root.
    if (yarnLock != null) {
      // If the lock file contains a `__metadata:` key, then it's v2+.
      return /^__metadata:$/mu.test(yarnLock)
        ? new Yarn({ rootDir })
        : new YarnClassic({ rootDir });
    }

    // No yarn.lock, so assume NPM (no need to check for package-lock.json)
    return new Npm({ rootDir });
  }
  else {
    const pnpmLockFilename = nodePath.resolve(rootDir, 'pnpm-lock.yaml');
    const pnpmLockExists = await nodeFs.access(pnpmLockFilename)
      .then(() => true, () => false);

    if (pnpmLockExists) {
      return new Pnpm({ rootDir });
    }
  }

  return null;
};

const cache = new Map<string, Promise<PackageManager | null>>();
