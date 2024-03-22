/**
 * Result of CLI argument parsing and actions.
 */
export interface CliResult<
  TOptions extends Record<string, unknown>,
  TCommand extends Record<string, UnknownCliResult | undefined>,
> {
  /**
   * Options derived from argument parsing and actions.
   */
  readonly options: TOptions;

  /**
   * Results of (sub-)command argument parsing and actions.
   *
   * NOTE: This is a "dictionary" object which will have zero or one keys
   * defined, because only zero or one commands can be matched per parent
   * command.
   */
  readonly commandResult: {
    readonly [P in keyof TCommand]: TCommand[P] | undefined;
  };

  /**
   * Option keys which have been parsed from command line arguments.
   *
   * NOTE: Options can also be set programmatically, which will _NOT_ add
   * them to this set. This set can be used to validate combinations of
   * options used on the command line (eg. conflicts) without being
   * affected by other programmatic updates and side effects.
   */
  readonly parsed: ReadonlySet<string>;

  /**
   * Name or alias of the CLI that produced this result. If the CLI is used as
   * a (sub-)command, this will be the name or alias that was matched.
   */
  name: string;

  /**
   * Get the help text of the CLI that produced this result.
   */
  getHelpText(error?: unknown): string;

  /**
   * Print the help text of the CLI that produced this result.
   */
  printHelp(error?: unknown): void;
}

/**
 * Partial result of CLI argument parsing and actions.
 */
export interface PartialCliResult<TResult extends UnknownCliResult> extends Pick<
  CliResult<InferCliResultOptions<TResult>, InferCliResultCommand<TResult>>, 'parsed' | 'getHelpText' | 'printHelp'
> {
  /**
   * Partial options.
   */
  readonly options: {
    [P in keyof InferCliResultOptions<TResult>]?: InferCliResultOptions<TResult>[P];
  };
  /**
   * Partial command results.
   */
  readonly commandResult: {
    readonly [P in keyof InferCliResultCommand<TResult>]:
      | PartialCliResult<Exclude<InferCliResultCommand<TResult>[P], undefined>>
      | undefined;
  };
}

/**
 * Infer the {@link CliResult.options} type from a {@link CliResult}.
 */
export type InferCliResultOptions<T extends UnknownCliResult | undefined> =
  T extends CliResult<infer TOptions, any> ? TOptions : never;

/**
 * Infer the {@link CliResult.commandResult} type from a {@link CliResult}.
 */
export type InferCliResultCommand<T extends UnknownCliResult | undefined> =
  T extends CliResult<any, infer TCommand> ? TCommand : never;

/**
 * Result of CLI argument parsing and actions with unknown options and commands.
 */
export type UnknownCliResult = CliResult<
  Record<string, unknown>,
  Record<string, UnknownCliResult | undefined>
>;

/**
 * Result of CLI argument parsing and actions with no options or commands.
 */
export type EmptyCliResult = CliResult<{}, {}>;
