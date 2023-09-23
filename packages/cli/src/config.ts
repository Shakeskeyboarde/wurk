import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getNpmWorkspaces } from './npm/get-npm-workspaces.js';
import { getNpmWorkspacesRoot } from './npm/get-npm-workspaces-root.js';
import { memoize } from './utils/memoize.js';
import { type PackageJson } from './utils/package-json.js';
import { readJsonFile } from './utils/read-json-file.js';
import { type WorkspacePackage } from './workspace/workspace-package.js';

export type PackageManager = 'npm';

export type Config = {
  readonly version: string;
  readonly description: string;
  readonly rootPackage: WorkspacePackage;
  readonly workspacePackages: readonly WorkspacePackage[];
  readonly commandPackageIds: Record<string, string>;
  readonly packageManager: PackageManager;
};

export const loadConfig = memoize(async (): Promise<Config> => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const [packageJson, rootDir, workspacePackages] = await Promise.all([
    await readFile(resolve(__dirname, '../package.json'), 'utf-8').then((json): PackageJson => JSON.parse(json)),
    await getNpmWorkspacesRoot(),
    await getNpmWorkspaces(),
  ]);

  process.chdir(rootDir);

  const { version = '', description = '' } = packageJson;
  const filename = resolve(rootDir, 'package.json');
  const rootPackageJson = await readJsonFile<
    PackageJson & { readonly werk?: { readonly commands?: Readonly<Record<string, string>> } }
  >(filename).catch(() => undefined);

  return {
    version,
    description,
    rootPackage: { name: ':root', version: '0.0.0', ...rootPackageJson, dir: rootDir },
    workspacePackages,
    commandPackageIds: rootPackageJson?.werk?.commands ?? {},
    packageManager: 'npm',
  };
});
