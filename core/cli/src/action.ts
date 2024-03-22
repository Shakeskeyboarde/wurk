import {
  type InferCliResultOptions,
  type PartialCliResult,
  type UnknownCliResult,
} from './result.js';

/**
 * Callback for performing an action when a command is parsed.
 */
export type CliAction<TResult extends UnknownCliResult = UnknownCliResult> = (
  result: TResult,
) =>
| void
| ((result: TResult) => void | Promise<void>)
| Promise<void | ((result: TResult) => void | Promise<void>)>;

/**
 * Callback for performing an action when an option is parsed.
 */
export type CliOptionAction<
  TResult extends UnknownCliResult = UnknownCliResult,
  TKey extends keyof InferCliResultOptions<TResult> = keyof InferCliResultOptions<TResult>,
> = (context: {
  readonly value: Exclude<InferCliResultOptions<TResult>[TKey], undefined>;
  readonly result: PartialCliResult<TResult>;
  readonly key: TKey;
}) => void | Promise<void>;
