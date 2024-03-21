/**
 * Result of CLI argument parsing and actions.
 */
export interface Result<
  TOptions extends Record<string, unknown>,
  TCommand extends Record<string, UnknownResult | undefined>,
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
export interface PartialResult<TResult extends UnknownResult> extends Pick<
  Result<InferResultOptions<TResult>, InferResultCommand<TResult>>, 'parsed' | 'getHelpText' | 'printHelp'
> {
  /**
   * Partial options.
   */
  readonly options: {
    [P in keyof InferResultOptions<TResult>]?: InferResultOptions<TResult>[P];
  };
  /**
   * Partial command results.
   */
  readonly commandResult: {
    readonly [P in keyof InferResultCommand<TResult>]:
      | PartialResult<Exclude<InferResultCommand<TResult>[P], undefined>>
      | undefined;
  };
}

/**
 * Infer the {@link Result.options} type from a {@link Result}.
 */
export type InferResultOptions<T extends UnknownResult | undefined> =
  T extends Result<infer TOptions, any> ? TOptions : never;

/**
 * Infer the {@link Result.commandResult} type from a {@link Result}.
 */
export type InferResultCommand<T extends UnknownResult | undefined> =
  T extends Result<any, infer TCommand> ? TCommand : never;

/**
 * Result of CLI argument parsing and actions with unknown options and commands.
 */
export type UnknownResult = Result<
  Record<string, unknown>,
  Record<string, UnknownResult | undefined>
>;

/**
 * Result of CLI argument parsing and actions with no options or commands.
 */
export type EmptyResult = Result<{}, {}>;
