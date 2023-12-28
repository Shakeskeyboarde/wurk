import { type CommandState } from './command-state.js';
import { type Result } from './result.js';

export interface ParserType {
  parse<TCommand extends CommandState<any, any, any, any, any>>(
    command: TCommand,
    args: readonly string[],
    onUnknownOption?: (args: string[]) => boolean,
  ): Result<TCommand>;
}
