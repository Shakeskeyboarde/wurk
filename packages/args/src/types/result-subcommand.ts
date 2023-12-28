import { type CommandState } from './command-state.js';
import { type Result } from './result.js';
import { type IfNever } from './utilities.js';

export type ResultSubcommand<TCommand extends CommandState<any, any, any, any, any>> =
  | IfNever<_ResultUnion<TCommand['commands']>, null>
  | (TCommand['isCommandOptional'] extends true ? null : never);

/**
 * Generate a union of all possible command result values.
 */
type _ResultUnion<TCommands extends readonly CommandState<any, any, any, any, any>[]> = TCommands extends readonly [
  infer TCommand,
  ...infer TRest extends readonly CommandState<any, any, any, any, any>[],
]
  ? TCommand extends CommandState<any, any, any, any, any>
    ? Result<TCommand> | _ResultUnion<TRest>
    : _ResultUnion<TRest>
  : never;
