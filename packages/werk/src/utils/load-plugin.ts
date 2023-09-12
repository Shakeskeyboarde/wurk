import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { inspect } from 'node:util';

import { getNpmWorkspacesRoot } from '../npm/get-npm-workspaces-root.js';
import { log } from './log.js';
import { type PackageJson } from './package-json.js';

export interface Plugin {
  readonly exports: Record<string, unknown>;
  readonly main: string;
  readonly dir: string;
  readonly packageJson: PackageJson;
}

const require = createRequire(import.meta.url);

const readPackageInfo = async (dir: string): Promise<{ packageJson: PackageJson; dir: string } | undefined> => {
  return await readFile(resolve(dir, 'package.json'), { encoding: 'utf8' })
    .then((json) => ({ packageJson: JSON.parse(json) as PackageJson, dir }))
    .catch(() => {
      const next = dirname(dir);
      return next === dir ? undefined : readPackageInfo(next);
    });
};

export const loadPlugin = async (packageNames: string | readonly string[]): Promise<Plugin | undefined> => {
  log.silly(`loadPlugin(${inspect(packageNames)})`);

  packageNames = Array.isArray(packageNames) ? packageNames : [packageNames];

  const workspacesRoot = await getNpmWorkspacesRoot();
  const paths = [resolve(workspacesRoot, 'node_modules')];

  let resolved: { exports: Record<string, unknown>; main: string } | undefined;

  for (const packageName of packageNames) {
    try {
      const main = require.resolve(packageName, { paths });
      const exports = await import(main);
      resolved = { exports, main };
      break;
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        typeof error.code === 'string' &&
        error.code?.includes('MODULE_NOT_FOUND')
      ) {
        continue;
      }

      throw new Error(`Failed loading plugin "${packageName}".${error instanceof Error ? `\n${error.message}` : ''}`, {
        cause: error,
      });
    }
  }

  if (!resolved) return;

  assert(
    typeof resolved.exports === 'object' && resolved.exports !== null,
    'Plugin import() did not return an object.',
  );

  const packageInfo = await readPackageInfo(dirname(resolved.main));

  return packageInfo && { ...resolved, ...packageInfo };
};
