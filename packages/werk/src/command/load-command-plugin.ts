import { type Config } from '../config.js';
import { type CommandInfo } from '../context/base-context.js';
import { loadPlugin } from '../utils/load-plugin.js';
import { type Command, isCommand } from './command.js';

export interface CommandPlugin extends CommandInfo {
  readonly command: Command<any, any, any>;
}

export const loadCommandPlugin = async (
  name: string,
  config: Pick<Config, 'commandPackages' | 'commandPackagePrefixes'>,
): Promise<CommandPlugin> => {
  const packageNames = [
    ...(config.commandPackages[name] != null ? [config.commandPackages[name] as string] : []),
    ...config.commandPackagePrefixes.map((prefix) => `${prefix}${name}`),
    `@werk/command-${name}`,
    `werk-command-${name}`,
  ];
  const plugin = await loadPlugin(packageNames);

  if (!plugin) throw new Error(`Command "${name}" not found. Do you need to install the command plugin package?`);

  const { exports, ...rest } = plugin;
  const command = exports?.default;

  if (!isCommand(command))
    throw new Error(
      `Command "${name}" does not have a valid command default export. It may not be compatible with this Werk version.`,
    );

  return { name, command, ...rest };
};
