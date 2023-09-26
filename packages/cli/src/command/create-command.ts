import { type CommanderArgs, type CommanderOptions } from '../commander/commander.js';
import { Command, type CommandHooks } from './command.js';

/**
 * Define a Werk custom command.
 *
 * The result of this function should be the default export of the command package.
 */
export const createCommand = <A extends CommanderArgs, O extends CommanderOptions, M>(
  hooks: CommandHooks<A, O, M>,
): unknown => {
  return new Command(hooks);
};
