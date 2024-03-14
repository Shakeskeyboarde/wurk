import nodeFs from 'node:fs/promises';
import nodePath from 'node:path';

import { JsonAccessor } from '@wurk/json';

import { Npm } from './implementations/npm.js';
import { Pnpm } from './implementations/pnpm.js';
import { Yarn } from './implementations/yarn.js';
import { YarnClassic } from './implementations/yarn-classic.js';
import { type PackageManager } from './pm.js';

export const createPackageManager = async (): Promise<PackageManager> => {
  let dir = process.cwd();

  do {
    const pm = await tryCreatePackageManager(dir);
    if (pm) return pm;
  } while (dir !== (dir = nodePath.dirname(dir)));

  throw new Error(`could not determine package manager at "${dir}"`);
};

const tryCreatePackageManager = async (dir: string): Promise<PackageManager | null> => {
  const configFilename = nodePath.resolve(dir, 'package.json');
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
        return new Npm({ rootDir: dir });
      case 'pnpm':
        return new Pnpm({ rootDir: dir });
      case 'yarn':
        return version.startsWith('1.')
          ? new YarnClassic({ rootDir: dir })
          : new Yarn({ rootDir: dir });
      default:
        throw new Error(`unsupported package manager "${id}" in "${configFilename}`);
    }
  }

  // There's a "workspaces" field in the `package.json` file, so this is is
  // a non-PNPM root.
  if (config
    .at('workspaces')
    .exists()) {
    const yarnLockFilename = nodePath.resolve(dir, 'yarn.lock');
    const yarnLock = await nodeFs.readFile(yarnLockFilename, 'utf8')
      .catch((error: any) => {
        if (error?.code === 'ENOENT') return null;
        throw error;
      });

    // There's a yarn.lock file so this is a Yarn root.
    if (yarnLock != null) {
      // If the lock file contains a `__metadata:` key, then it's v2+.
      return /^__metadata:$/mu.test(yarnLock)
        ? new Yarn({ rootDir: dir })
        : new YarnClassic({ rootDir: dir });
    }

    // No yarn.lock, so assume NPM (no need to check for package-lock.json)
    return new Npm({ rootDir: dir });
  }
  else {
    const pnpmLockFilename = nodePath.resolve(dir, 'pnpm-lock.yaml');
    const pnpmLockExists = await nodeFs.access(pnpmLockFilename)
      .then(() => true, () => false);

    if (pnpmLockExists) {
      return new Pnpm({ rootDir: dir });
    }
  }

  return null;
};
