import { type CliActionError, CliParseError } from './error.js';
import { type InferResultCommand, type InferResultOptions, type PartialResult, type UnknownResult } from './result.js';
import { type KeyOf } from './types.js';

type Action<TResult extends UnknownResult = UnknownResult> = (
  result: TResult,
) => void | ((result: TResult) => void | Promise<void>) | Promise<void | ((result: TResult) => void | Promise<void>)>;

type OptionAction<
  TResult extends UnknownResult = UnknownResult,
  TKey extends KeyOf<InferResultOptions<TResult>> = KeyOf<InferResultOptions<TResult>>,
> = (context: {
  readonly value: Exclude<InferResultOptions<TResult>[TKey], undefined>;
  readonly result: PartialResult<InferResultOptions<TResult>, InferResultCommand<TResult>>;
  readonly key: TKey;
}) => void | Promise<void>;

type ExitAction = (error: CliParseError | CliActionError) => void | Promise<void>;

const defaultExitAction: ExitAction = (error) => {
  if (error instanceof CliParseError) {
    error.cli.printHelp(error);
    process.exitCode ||= 1;
  } else {
    console.error(String(error));
    process.exitCode ||= 2;
  }

  // eslint-disable-next-line unicorn/no-process-exit
  process.exit();
};

export { type Action, defaultExitAction, type ExitAction, type OptionAction };
