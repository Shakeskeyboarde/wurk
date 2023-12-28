import { type CommandState } from './command-state.js';

export type CommandStateFrom<TCommandStateLike extends CommandState<any, any, any, any, any>> = CommandState<
  TCommandStateLike['name'],
  TCommandStateLike['namedOptions'],
  TCommandStateLike['positionalOptions'],
  TCommandStateLike['commands'],
  TCommandStateLike['isCommandOptional']
>;
