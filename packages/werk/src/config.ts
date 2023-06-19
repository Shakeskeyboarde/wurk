import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getNpmWorkspaces } from './npm/get-npm-workspaces.js';
import { getNpmWorkspacesRoot } from './npm/get-npm-workspaces-root.js';
import { memoize } from './utils/memoize.js';
import { merge } from './utils/merge.js';
import { type PackageJson } from './utils/package-json.js';
import { readJsonFile } from './utils/read-json-file.js';
import { type WorkspaceOptions } from './workspace/workspace.js';

interface CommandConfig {
  readonly globalArgs: readonly string[];
  readonly args: readonly string[];
  readonly config: unknown;
}

export type Config = {
  readonly version: string;
  readonly description: string;
  readonly rootDir: string;
  readonly workspaces: readonly WorkspaceOptions[];
  readonly commandPackagePrefixes: string[];
  readonly commandPackages: Record<string, string>;
  readonly commandConfigs: Record<string, CommandConfig>;
  readonly globalArgs: readonly string[];
};

export const loadConfig = memoize(async (): Promise<Config> => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const [packageJson, rootDir, workspaces] = await Promise.all([
    await readFile(join(__dirname, '../package.json'), 'utf-8').then((json): PackageJson => JSON.parse(json)),
    await getNpmWorkspacesRoot(),
    await getNpmWorkspaces(),
  ]);
  const { version = '', description = '' } = packageJson;
  const filename = join(rootDir, 'package.json');
  const rootPackageJson = filename ? await readJsonFile<PackageJson>(filename) : {};

  let globalArgs: string[] | undefined;
  let commandPackagePrefixes: string[] | undefined;
  let commandPackages: Record<string, string> | undefined;
  let rootCommandConfigs: Record<string, unknown>;
  let commandConfig: Record<string, unknown> | undefined;

  // eslint-disable-next-line prefer-const
  ({ globalArgs, commandPackagePrefixes, commandPackages, commandConfig, ...rootCommandConfigs } = isObject(
    rootPackageJson?.werk,
  )
    ? (rootPackageJson.werk as Record<string, any>)
    : {});

  globalArgs = Array.isArray(globalArgs) ? globalArgs.map(String) : [];

  commandPackagePrefixes = Array.isArray(commandPackagePrefixes)
    ? commandPackagePrefixes.filter((value) => typeof value === 'string')
    : [];

  commandPackages = isObject(commandPackages)
    ? Object.fromEntries(
        Object.entries(commandPackages).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
      )
    : {};

  const commandConfigs = Object.fromEntries(
    Object.entries(merge(commandConfig, rootCommandConfigs))
      .filter((entry): entry is [string, Record<string, unknown>] => isObject(entry[1]))
      .map(([key, value]) => {
        return [
          key,
          {
            globalArgs: Array.isArray(value?.globalArgs) ? value.globalArgs.map(String) : [],
            args: Array.isArray(value?.args) ? value.args.map(String) : [],
            config: value?.config,
          },
        ];
      }),
  );

  return {
    version,
    description,
    rootDir,
    workspaces,
    commandPackagePrefixes,
    commandPackages,
    commandConfigs,
    globalArgs,
  };
});

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};
