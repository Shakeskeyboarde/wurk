import {
  type InferResultCommand,
  type InferResultOptions,
  type PartialResult,
  type UnknownResult,
} from './result.js';

type Action<TResult extends UnknownResult = UnknownResult> = (
  result: TResult,
) =>
| void
| ((result: TResult) => void | Promise<void>)
| Promise<void | ((result: TResult) => void | Promise<void>)>;

type OptionAction<
  TResult extends UnknownResult = UnknownResult,
  TKey extends keyof InferResultOptions<TResult> = keyof InferResultOptions<TResult>,
> = (context: {
  readonly value: Exclude<InferResultOptions<TResult>[TKey], undefined>;
  readonly result: PartialResult<
    InferResultOptions<TResult>,
    InferResultCommand<TResult>
  >;
  readonly key: TKey;
}) => void | Promise<void>;

export { type Action, type OptionAction };
