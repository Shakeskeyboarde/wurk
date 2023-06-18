import { type Config } from '../config.js';
import { loadPlugin, type Plugin } from '../utils/load-plugin.js';
import { type Command, isCommand } from './command.js';

export type CommandInfo = Omit<Plugin, 'exports'>;

export interface CommandPlugin extends CommandInfo {
  readonly command: Command<any, any, any>;
}

export const loadCommandPlugin = async (
  cmd: string,
  config: Pick<Config, 'commandPackages' | 'commandPackagePrefixes'>,
): Promise<CommandPlugin> => {
  const packageNames = [
    ...(config.commandPackages[cmd] != null ? [config.commandPackages[cmd] as string] : []),
    ...config.commandPackagePrefixes.map((prefix) => `${prefix}${cmd}`),
    `@werk/command-${cmd}`,
    `werk-command-${cmd}`,
  ];
  const plugin = await loadPlugin(packageNames);

  if (!plugin) throw new Error(`Command "${cmd}" not found. Do you need to install the command plugin package?`);

  const { exports, ...rest } = plugin;
  const command = exports?.default;

  if (!isCommand(command)) throw new Error(`Command "${cmd}" does not have a valid command default export.`);

  return { command, ...rest };
};
