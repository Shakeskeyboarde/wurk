import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { inspect } from 'node:util';

import { log } from './log.js';
import { type PackageJson } from './package-json.js';
import { readPackageInfo } from './read-package-info.js';

export interface Plugin {
  readonly exports: Record<string, unknown>;
  readonly main: string;
  readonly dir: string;
  readonly packageJson: PackageJson;
}

const require = createRequire(import.meta.url);

export const loadPlugin = async (workspacesRoot: string, packageId: string): Promise<Plugin> => {
  log.silly(`loadPlugin(${inspect(packageId)})`);

  const main = require.resolve(packageId, { paths: [resolve(workspacesRoot, 'node_modules')] });
  const exports = await import(main);
  const packageInfo = await readPackageInfo(dirname(main));

  if (!packageInfo) throw new Error('Could not read plugin package.json file.');

  return packageInfo && { main, exports, ...packageInfo };
};
