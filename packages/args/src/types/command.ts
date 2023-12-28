import { type Action } from './action.js';
import { type CommandState } from './command-state.js';
import { type ArgsErrorType } from './error.js';
import { type HelpType } from './help.js';
import { type Named } from './named.js';
import { type NamedConfig } from './named-config.js';
import { type NamedInitialValue } from './named-initial-value.js';
import { type ParserType } from './parser.js';
import { type Positional } from './positional.js';
import { type PositionalConfig } from './positional-config.js';
import { type PositionalDefaultValue } from './positional-default-value.js';
import { type ProgramType } from './program.js';
import { type ProgramRunOptions } from './program-run-options.js';

export interface CommandType<
  TName extends string,
  TNamed extends readonly Named<any, any, any, any>[] = [],
  TPositional extends readonly Positional<any, any>[] = [],
  TCommands extends readonly CommandState<any, any, any, any, any>[] = [],
  TCommandOptional extends boolean = false,
> extends CommandState<TName, TNamed, TPositional, TCommands, TCommandOptional> {
  /**
   * Add one more more aliases to the command.
   *
   * Aliases which match more than one command will be disabled.
   */
  alias(alias: string): CommandType<TName, TNamed, TPositional, TCommands, TCommandOptional>;

  /**
   * Add a paragraph to the command description.
   */
  description(description: string): CommandType<TName, TNamed, TPositional, TCommands, TCommandOptional>;

  /**
   * Add a paragraph to the end of the command help text.
   */
  trailer(trailer: string): CommandType<TName, TNamed, TPositional, TCommands, TCommandOptional>;

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
  setDefault(enabled?: boolean): CommandType<TName, TNamed, TPositional, TCommands, TCommandOptional>;

  /**
   * When set, the parent command will not be allowed to handle named
   * options which are unknown to this command.
   */
  setGreedy(enabled?: boolean): CommandType<TName, TNamed, TPositional, TCommands, TCommandOptional>;

  /**
   * When set, named options will be parsed until the first positional
   * option is encountered, after which all arguments will be treated as
   * positional options.
   *
   * This includes unknown named options treated as positional options
   * when `isUnknownNamedOptionPositional` is also set.
   */
  setTrailingNamedOptionPositional(
    enabled?: boolean,
  ): CommandType<TName, TNamed, TPositional, TCommands, TCommandOptional>;

  /**
   * When set, unknown named options (eg. arguments beginning with
   * hyphens) will be treated as positional options.
   */
  setUnknownNamedOptionPositional(
    enabled?: boolean,
  ): CommandType<TName, TNamed, TPositional, TCommands, TCommandOptional>;

  /**
   * When set, parsing will succeed if no subcommand is matched. This is
   * only necessary when subcommands are defined.
   */
  setCommandOptional<TEnabled extends boolean = true>(
    enabled?: TEnabled,
  ): CommandType<TName, TNamed, TPositional, TCommands, TEnabled>;

  /**
   * Set the help formatter to use when generating help text.
   */
  setHelp(help: HelpType | null): CommandType<TName, TNamed, TPositional, TCommands, TCommandOptional>;

  /**
   * Set the parser to use when parsing arguments.
   */
  setParser(parser: ParserType | null): CommandType<TName, TNamed, TPositional, TCommands, TCommandOptional>;

  /**
   * Set the parent command.
   */
  setParent(
    parent: CommandState<any, any, any, any, any> | null,
  ): CommandType<TName, TNamed, TPositional, TCommands, TCommandOptional>;

  /**
   * Add a named option.
   */
  option<
    TUsage extends `-${string}`,
    TValue = NamedInitialValue<TUsage>,
    TRequired extends boolean = false,
    TMap extends boolean = false,
  >(
    usage: TUsage,
    config?: NamedConfig<TUsage, TValue, TRequired, TMap>,
  ): CommandType<
    TName,
    readonly [...TNamed, Named<TUsage, TValue, TRequired, TMap>],
    TPositional,
    TCommands,
    TCommandOptional
  >;

  /**
   * Add a positional option.
   */
  positional<TUsage extends `<${string}>` | `[${string}]`, TValue = PositionalDefaultValue<TUsage>>(
    usage: TUsage,
    config?: PositionalConfig<TUsage, TValue>,
  ): CommandType<TName, TNamed, [...TPositional, Positional<TUsage, TValue>], TCommands, TCommandOptional>;

  /**
   * Add a subcommand.
   *
   * ### Limitations
   *
   * - Subcommands and required positional options are mutually exclusive.
   * - Subcommands are matched if the _FIRST_ non-named-option argument
   * matches the subcommand name or one of its aliases. Therefore, if a
   * subcommand is matched, the parent command will receive no
   * positional options.
   */
  command<TCommand extends CommandType<any, any, any, any, any>>(
    command: TCommand,
  ): CommandType<
    TName,
    TNamed,
    TPositional,
    [
      ...TCommands,
      CommandState<
        TCommand['name'],
        TCommand['namedOptions'],
        TCommand['positionalOptions'],
        TCommand['commands'],
        TCommand['isCommandOptional']
      >,
    ],
    TCommandOptional
  >;

  /**
   * Add an action.
   *
   * Actions are run after all arguments are parsed, and before
   * subcommand actions are run. However, It may return a callback to be
   * invoked _AFTER_ all subcommand actions have been run.
   */
  action(callback: Action<this>): CommandType<TName, TNamed, TPositional, TCommands, TCommandOptional>;

  /**
   * Return the help text for this command.
   */
  getHelpText(error?: Error): string;

  /**
   * Print the help text for this command to the STDERR stream.
   */
  printHelp(error?: Error): void;

  /**
   * Parse command line arguments and run command actions.
   *
   * If `args` is not provided, `process.argv.slice(2)` is used. When
   * manually providing `args`, any extra leading arguments must be
   * removed.
   */
  parse(args?: readonly string[]): ProgramType<this>;

  /**
   * Shortcut for using a command to parse args and then running the
   * resulting program (ie. `command.parse().run()`).
   */
  run(args?: readonly string[], options?: ProgramRunOptions): Promise<null | ArgsErrorType>;
}
