import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getNpmWorkspaces } from './npm/get-npm-workspaces.js';
import { getNpmWorkspacesRoot } from './npm/get-npm-workspaces-root.js';
import { memoize } from './utils/memoize.js';
import { type PackageJson } from './utils/package-json.js';
import { readJsonFile } from './utils/read-json-file.js';
import { type WorkspaceOptions } from './workspace/workspace.js';

interface CommandConfig {
  readonly globalArgs: readonly string[];
  readonly args: readonly string[];
}

export interface Config {
  readonly version: string;
  readonly rootDir: string;
  readonly workspaces: readonly WorkspaceOptions[];
  readonly commandPackagePrefixes: string[];
  readonly commandPackages: Record<string, string>;
  readonly commandConfig: Record<string, CommandConfig>;
  readonly globalArgs: readonly string[];
}

export const loadConfig = memoize(async (): Promise<Config> => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const [version, rootDir, workspaces] = await Promise.all([
    await readFile(join(__dirname, '../package.json'), 'utf-8').then((json) => JSON.parse(json).version),
    await getNpmWorkspacesRoot(),
    await getNpmWorkspaces(),
  ]);
  const filename = join(rootDir, 'package.json');
  const packageJson = filename ? await readJsonFile<PackageJson>(filename) : {};
  const root = isObject(packageJson?.werk) ? packageJson.werk : {};
  const commandPackagePrefixes = Array.isArray(root?.commandPackagePrefixes)
    ? root.commandPackagePrefixes.filter((value) => typeof value === 'string')
    : [];
  const commandPackages = isObject(root?.commandPackages)
    ? Object.fromEntries(
        Object.entries(root.commandPackages).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
      )
    : {};
  const commandConfig = isObject(root?.commandConfig)
    ? Object.fromEntries(
        Object.entries(root.commandConfig)
          .filter((entry): entry is [string, Record<string, unknown>] => isObject(entry[1]))
          .map(([key, value]) => {
            return [
              key,
              {
                globalArgs: Array.isArray(value?.globalArgs) ? value.globalArgs.map(String) : [],
                args: Array.isArray(value?.args) ? value.args.map(String) : [],
              },
            ];
          }),
      )
    : {};
  const globalArgs = Array.isArray(root?.globalArgs) ? root.globalArgs.map(String) : [];

  return {
    version,
    rootDir,
    workspaces,
    commandPackagePrefixes,
    commandPackages,
    commandConfig,
    globalArgs,
  };
});

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};
