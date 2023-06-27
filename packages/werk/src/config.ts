import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getNpmWorkspaces } from './npm/get-npm-workspaces.js';
import { getNpmWorkspacesRoot } from './npm/get-npm-workspaces-root.js';
import { memoize } from './utils/memoize.js';
import { merge } from './utils/merge.js';
import { type PackageJson } from './utils/package-json.js';
import { readJsonFile } from './utils/read-json-file.js';
import { type WorkspacePackage } from './workspace/workspace-package.js';

export type PackageManager = 'npm';

export interface CommandConfig {
  readonly globalArgs: readonly string[];
  readonly args: readonly string[];
  readonly config: unknown;
}

export type Config = {
  readonly version: string;
  readonly description: string;
  readonly rootPackage: WorkspacePackage;
  readonly workspacePackages: readonly WorkspacePackage[];
  readonly commandPackagePrefixes: string[];
  readonly commandPackages: Record<string, string>;
  readonly commandConfigs: Record<string, CommandConfig>;
  readonly globalArgs: readonly string[];
  readonly packageManager: PackageManager;
};

export const loadConfig = memoize(async (): Promise<Config> => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const [packageJson, rootDir, workspacePackages] = await Promise.all([
    await readFile(join(__dirname, '../package.json'), 'utf-8').then((json): PackageJson => JSON.parse(json)),
    await getNpmWorkspacesRoot(),
    await getNpmWorkspaces(),
  ]);
  const { version = '', description = '' } = packageJson;
  const filename = join(rootDir, 'package.json');
  const rootPackageJson: PackageJson | undefined = await readJsonFile<PackageJson>(filename).catch(() => undefined);
  const werk = isObject(rootPackageJson?.werk) ? { ...rootPackageJson?.werk } : {};
  const globalArgs = Array.isArray(werk.globalArgs) ? werk.globalArgs.map(String) : [];
  const commandPackagePrefixes = Array.isArray(werk.commandPackagePrefixes)
    ? werk.commandPackagePrefixes.filter((value) => typeof value === 'string')
    : [];
  const commandPackages = isObject(werk.commandPackages)
    ? Object.fromEntries(
        Object.entries(werk.commandPackages).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
      )
    : {};
  const legacyCommandConfigs = werk.commandConfig;

  delete werk.globalArgs;
  delete werk.commandPackagePrefixes;
  delete werk.commandPackages;
  delete werk.commandConfig;

  const commandConfigs = Object.fromEntries(
    Object.entries(merge(legacyCommandConfigs, werk)).flatMap(([key, value]) => {
      return isObject(value)
        ? [
            [
              key,
              {
                globalArgs: Array.isArray(value?.globalArgs) ? value.globalArgs.map(String) : [],
                args: Array.isArray(value?.args) ? value.args.map(String) : [],
                config: value?.config,
              },
            ],
          ]
        : [];
    }),
  );

  return {
    version,
    description,
    rootPackage: { name: ':root', version: '0.0.0', ...rootPackageJson, dir: rootDir },
    workspacePackages,
    commandPackagePrefixes,
    commandPackages,
    commandConfigs,
    globalArgs,
    packageManager: 'npm',
  };
});

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};
