import { type KeyOf } from './types.js';

interface Result<
  TOptions extends Record<string, unknown>,
  TCommand extends Record<string, UnknownResult | undefined>,
> {
  /**
   * Options derived from argument parsing and actions.
   */
  readonly options: TOptions;

  /**
   * Results of CLI argument parsing and actions.
   *
   * NOTE: This is a "dictionary" object which will have zero or one keys
   * defined, because only zero or one commands can be matched per parent
   * command.
   */
  readonly command: {
    readonly [P in KeyOf<TCommand>]: TCommand[P] | undefined;
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

interface PartialResult<
  TOptions extends Record<string, unknown>,
  TCommand extends Record<string, UnknownResult | undefined>,
  TKey extends KeyOf<TOptions> = never,
> extends Pick<
    Result<TOptions, TCommand>,
    'parsed' | 'getHelpText' | 'printHelp'
  > {
  readonly options: {
    [P in KeyOf<TOptions>]: TOptions[P] | (P extends TKey ? never : undefined);
  };
  readonly command: {
    readonly [P in keyof TCommand]:
      | PartialResult<
        InferResultOptions<TCommand[P]>,
        InferResultCommand<TCommand[P]>
      >
      | undefined;
  };
}

type InferResultOptions<T extends UnknownResult | undefined> =
  T extends Result<infer TOptions, any> ? TOptions : never;
type InferResultCommand<T extends UnknownResult | undefined> =
  T extends Result<any, infer TCli> ? TCli : never;

type UnknownResult = Result<
  Record<string, unknown>,
  Record<string, UnknownResult | undefined>
>;
type EmptyResult = Result<{}, {}>;

export type {
  EmptyResult,
  InferResultCommand,
  InferResultOptions,
  PartialResult,
  Result,
  UnknownResult,
};
