import { type CommandConfig } from './command-config.js';
import { type Named } from './named.js';
import { type Positional } from './positional.js';

export interface CommandState<
  TName extends string,
  TNamed extends readonly Named<any, any, any, any>[],
  TPositional extends readonly Positional<any, any>[],
  TCommands extends readonly CommandState<any, any, any, any, any>[],
  TCommandOptional extends boolean,
> extends Required<CommandConfig<TName, TNamed, TPositional, TCommands, TCommandOptional>> {
  //
}
