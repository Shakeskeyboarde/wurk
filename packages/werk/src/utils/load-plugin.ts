import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspect } from 'node:util';

import { getNpmGlobalPackagesRoot } from '../npm/get-npm-global-packages-root.js';
import { getNpmWorkspacesRoot } from '../npm/get-npm-workspaces-root.js';
import { log } from './log.js';
import { memoize } from './memoize.js';
import { type PackageJson } from './package-json.js';

export interface Plugin {
  readonly exports: Record<string, unknown>;
  readonly main: string;
  readonly dir: string;
  readonly packageJson: PackageJson;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const readPackageInfo = async (dir: string): Promise<{ packageJson: PackageJson; dir: string } | undefined> => {
  return await readFile(join(dir, 'package.json'), { encoding: 'utf8' })
    .then((json) => ({ packageJson: JSON.parse(json) as PackageJson, dir }))
    .catch(() => {
      const next = dirname(dir);
      return next === dir ? undefined : readPackageInfo(next);
    });
};

export const loadPlugin = memoize(
  async (packageNames: string | readonly string[]): Promise<Plugin | undefined> => {
    log.silly(`loadPlugin(${inspect(packageNames)})`);

    packageNames = Array.isArray(packageNames) ? packageNames : [packageNames];

    const [workspacesRoot, globalPackagesRoot] = await Promise.all([
      getNpmWorkspacesRoot(),
      getNpmGlobalPackagesRoot(),
    ]);

    const paths = [join(workspacesRoot, 'node_modules'), globalPackagesRoot, __dirname];
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

        throw new Error(
          `Failed loading plugin "${packageName}".${error instanceof Error ? `\n${error.message}` : ''}`,
          { cause: error },
        );
      }
    }

    if (!resolved) return;

    assert(
      typeof resolved.exports === 'object' && resolved.exports !== null,
      'Plugin import() did not return an object.',
    );

    const packageInfo = await readPackageInfo(dirname(resolved.main));

    return packageInfo && { ...resolved, ...packageInfo };
  },
  (packageNames) => JSON.stringify(packageNames),
);
