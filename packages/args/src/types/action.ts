import { type ActionCleanup } from './action-cleanup.js';
import { type CommandState } from './command-state.js';
import { type Result } from './result.js';

export type Action<TCommand extends CommandState<any, any, any, any, any>> = (
  args: Result<TCommand>,
) => void | undefined | ActionCleanup<TCommand> | Promise<void | undefined | ActionCleanup<TCommand>>;
