import { type CommandState } from './command-state.js';
import { type Result } from './result.js';

export type ActionCleanup<TCommand extends CommandState<any, any, any, any, any>> = (
  args: Result<TCommand>,
) => void | undefined | Promise<void | undefined>;
