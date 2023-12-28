import { type Action } from './action.js';
import { type CommandState } from './command-state.js';
import { type HelpType } from './help.js';
import { type Named } from './named.js';
import { type ParserType } from './parser.js';
import { type Positional } from './positional.js';

export interface CommandConfig<
  TName extends string,
  TNamed extends readonly Named<any, any, any, any>[],
  TPositional extends readonly Positional<any, any>[],
  TCommands extends readonly CommandState<any, any, any, any, any>[],
  TCommandOptional extends boolean,
> {
  /**
   * Command name.
   */
  readonly name: TName;

  /**
   * Command aliases. When used as a subcommand, these aliases will
   * also be matched.
   */
  readonly aliases?: readonly string[];

  /**
   * Description paragraphs which will be displayed near the beginning
   * of the help text.
   */
  readonly descriptions?: readonly string[];

  /**
   * Trailer paragraphs which will be displayed at the end of the help
   * text.
   */
  readonly trailers?: readonly string[];

  /**
   * When set, the command will be used when no other subcommands are
   * matched.
   *
   * ### Limitations
   *
   * - Has no effect on root commands.
   * - Only one default subcommand is allowed.
   * - Default subcommands cannot be added to commands which accept
   * _ANY_ positional arguments.
   */
  readonly isDefault?: boolean;

  /**
   * When set, parent commands will not be able to handle any arguments
   * passed to this command. Otherwise, any named arguments may be
   * handled by a parent command if they are unknown to this command.
   */
  readonly isGreedy?: boolean;

  /**
   * When set, named options will be parsed until the first positional
   * option is encountered, after which all arguments will be treated as
   * positional options.
   *
   * This includes unknown named options treated as positional options
   * when `isUnknownNamedOptionPositional` is also set.
   */
  readonly isTrailingNamedOptionPositional?: boolean;

  /**
   * When set, unknown named options (eg. arguments beginning with
   * hyphens) will be treated as positional options.
   */
  readonly isUnknownNamedOptionPositional?: boolean;

  /**
   * When set, parsing will succeed if no subcommand is matched. This is
   * only necessary when subcommands are defined.
   */
  readonly isCommandOptional?: TCommandOptional;

  /**
   * Named option definitions.
   */
  readonly namedOptions?: TNamed;

  /**
   * Positional option definitions.
   */
  readonly positionalOptions?: TPositional;

  /**
   * Sub commands.
   */
  readonly commands?: TCommands;

  /**
   * The action which will be run after the command has parsed arguments.
   */
  readonly actions?: readonly Action<CommandState<TName, TNamed, TPositional, TCommands, TCommandOptional>>[];

  /**
   * Help instance which will be used to format the command's help text.
   */
  readonly help?: HelpType | null;

  /**
   * Parser instance which will be used to parse command line arguments
   * into a result for this command.
   */
  readonly parser?: ParserType | null;

  /**
   * Parent command.
   */
  readonly parent?: CommandState<any, any, any, any, any> | null;
}
