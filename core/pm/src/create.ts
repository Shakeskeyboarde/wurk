import nodePath from 'node:path';

import { fs } from '@wurk/fs';

import { Npm } from './implementations/npm.js';
import { Pnpm } from './implementations/pnpm.js';
import { Yarn } from './implementations/yarn.js';
import { YarnClassic } from './implementations/yarn-classic.js';
import { type PackageManager } from './pm.js';

export const createPackageManager = async (
  dir = '.',
): Promise<PackageManager> => {
  const cacheKey = fs.resolve(dir);

  let promise = cache.get(cacheKey);

  if (!promise) {
    promise = getPromise(dir).then((pm) => {
      if (pm) {
        return pm;
      } else {
        const parentDir = nodePath.dirname(dir);
        return parentDir === dir ? null : getPromise(parentDir);
      }
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
  const configFilename = fs.resolve(rootDir, 'package.json');
  const config = await fs.readJson(configFilename);
  const packageManager = config.at('packageManager').as('string');

  // There's a "packageManager" field in the "package.json" file, so this is
  // a root.
  if (packageManager != null) {
    const match = /^([^@]+)(?:@(.+)$)?/u.exec(packageManager);

    // The field value doesn't even loosely match the expected format.
    if (!match) {
      throw new Error(
        `invalid package manager "${packageManager}" in "${configFilename}"`,
      );
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
        throw new Error(
          `unsupported package manager "${id}" in "${configFilename}`,
        );
    }
  }

  // There's a "workspaces" field in the `package.json` file, so this is is
  // a non-PNPM root.
  if (config.at('workspaces').exists()) {
    const yarnLock = await fs.readText([rootDir, 'yarn.lock']);

    // There's a yarn.lock file so this is a Yarn root.
    if (yarnLock != null) {
      // If the lock file contains a `__metadata:` key, then it's v2+.
      return /^__metadata:$/mu.test(yarnLock)
        ? new Yarn({ rootDir })
        : new YarnClassic({ rootDir });
    }

    // No yarn.lock, so assume NPM (no need to check for package-lock.json)
    return new Npm({ rootDir });
  } else if (await fs.exists([rootDir, 'pnpm-lock.yaml'])) {
    return new Pnpm({ rootDir });
  }

  return null;
};

const cache = new Map<string, Promise<PackageManager | null>>();
