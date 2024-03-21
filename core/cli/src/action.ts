import {
  type InferResultOptions,
  type PartialResult,
  type UnknownResult,
} from './result.js';

/**
 * Callback for performing an action when a command is parsed.
 */
export type Action<TResult extends UnknownResult = UnknownResult> = (
  result: TResult,
) =>
| void
| ((result: TResult) => void | Promise<void>)
| Promise<void | ((result: TResult) => void | Promise<void>)>;

/**
 * Callback for performing an action when an option is parsed.
 */
export type OptionAction<
  TResult extends UnknownResult = UnknownResult,
  TKey extends keyof InferResultOptions<TResult> = keyof InferResultOptions<TResult>,
> = (context: {
  readonly value: Exclude<InferResultOptions<TResult>[TKey], undefined>;
  readonly result: PartialResult<TResult>;
  readonly key: TKey;
}) => void | Promise<void>;
