import nodeFs from 'node:fs/promises';
import nodePath from 'node:path';

import { JsonAccessor } from '@wurk/json';

import { Npm } from './implementations/npm.js';
import { Pnpm } from './implementations/pnpm.js';
import { Yarn } from './implementations/yarn.js';
import { type PackageManager } from './pm.js';

/**
 * Create a package manager instance for the current working directory.
 */
export const createPackageManager = async (): Promise<PackageManager> => {
  let dir = process.cwd();

  do {
    const pm = await tryCreatePackageManager(dir);
    if (pm) return pm;
  } while (dir !== (dir = nodePath.dirname(dir)));

  return new Npm(process.cwd(), new JsonAccessor());
};

const tryCreatePackageManager = async (dir: string): Promise<PackageManager | null> => {
  const configFilename = nodePath.resolve(dir, 'package.json');
  const config = await nodeFs.readFile(configFilename, 'utf8')
    .catch(() => undefined)
    .then(JsonAccessor.parse);
  const packageManager = config
    .at('packageManager')
    .as('string');

  // There's a "packageManager" field in the "package.json" file, so this is
  // a root.
  if (packageManager != null) {
    const match = /^[^@]+/u.exec(packageManager);

    // The field value doesn't even loosely match the expected format.
    if (!match) {
      throw new Error(`invalid package manager "${packageManager}" in "${configFilename}"`);
    }

    const [name] = match;

    switch (name) {
      case 'npm':
        return new Npm(dir, config);
      case 'pnpm':
        return new Pnpm(dir, config);
      case 'yarn':
        return new Yarn(dir, config);
      default:
        throw new Error(`unsupported package manager "${name}" in "${configFilename}`);
    }
  }

  const pnpmWorkspaceFilename = nodePath.resolve(dir, 'pnpm-workspace.yaml');
  const pnpmWorkspaceExists = await nodeFs.access(pnpmWorkspaceFilename)
    .then(() => true, () => false);

  if (pnpmWorkspaceExists) {
    return new Pnpm(dir, config);
  }

  const workspacesFieldExists = config
    .at('workspaces')
    .exists();

  if (workspacesFieldExists) {
    const yarnLockFilename = nodePath.resolve(dir, 'yarn.lock');
    const yarnLockExists = await nodeFs.access(yarnLockFilename)
      .then(() => true, () => false);

    // There's a yarn.lock file so this is a Yarn root.
    if (yarnLockExists) {
      return new Yarn(dir, config);
    }

    // No yarn.lock, so assume NPM (no need to check for package-lock.json)
    return new Npm(dir, config);
  }

  return null;
};
