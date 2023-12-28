import { type CommandState } from './command-state.js';
import { type ResultOptions } from './result-options.js';
import { type ResultPositional } from './result-positional.js';
import { type ResultSubcommand } from './result-subcommand.js';

export interface Result<TCommand extends CommandState<any, any, any, any, any>> {
  /**
   * The command that produced this result.
   */
  readonly command: TCommand;

  /**
   * The name of the command that produced this result.
   */
  readonly name: TCommand['name'];

  /**
   * Named options parsed from the command line by this command.
   */
  readonly options: ResultOptions<TCommand['namedOptions']>;

  /**
   * Positional options parsed from the command line by this command.
   */
  readonly positional: ResultPositional<TCommand['positionalOptions']>;

  /**
   * Arguments left over after parsing this command (and its subcommands).
   */
  readonly extra: string[];

  /**
   * Subcommand results if a subcommand was matched during parsing.
   */
  readonly subcommand: ResultSubcommand<TCommand>;
}
