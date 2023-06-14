import { join } from 'node:path';

import { getNpmWorkspacesRoot } from '../npm/get-npm-workspaces-root.js';
import { loadPlugin, type Plugin } from '../utils/load-plugin.js';
import { type PackageJson } from '../utils/package-json.js';
import { readJsonFile } from '../utils/read-json-file.js';
import { type CommandType, isCommand } from './command.js';

export type CommandInfo = Omit<Plugin, 'exports'>;

export interface CommandPlugin extends CommandInfo {
  readonly command: CommandType<any, any>;
}

export const loadCommandPlugin = async (name: string): Promise<CommandPlugin> => {
  const workspacesRoot = await getNpmWorkspacesRoot();
  const packageJson = await readJsonFile<PackageJson>(join(workspacesRoot, 'package.json'));
  const packageNames = await readJsonFile(`${workspacesRoot}/package.json`).then((json: any) => {
    const customPackageName: string | undefined = json?.werk?.commandPackages?.[name];
    if (typeof customPackageName === 'string') return [customPackageName];
    const customPrefixes: readonly string[] = packageJson?.werk?.commandPackagePrefixes ?? [];
    return [...customPrefixes, `@werk/command-`, `werk-command-`].map((prefix) => `${prefix}${name}`);
  });
  const plugin = await loadPlugin(packageNames);

  if (!plugin) throw new Error(`Command "${name}" not found. Do you need to install the command plugin package?`);

  const { exports, ...rest } = plugin;
  const command = exports?.default;

  if (!isCommand(command)) throw new Error(`Command "${name}" does not have a valid command default export.`);

  return { command, ...rest };
};
