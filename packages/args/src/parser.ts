import { type CommandState } from './types/command-state.js';
import { type ParserType } from './types/parser.js';
import { type Result } from './types/result.js';

export class Parser implements ParserType {
  parse<TCommand extends CommandState<any, any, any, any, any>>(
    command: TCommand,
    args: readonly string[],
    onUnknownOption?: (args: string[]) => boolean,
  ): Result<TCommand> {
    if (command.isGreedy || !onUnknownOption) {
      // Do not pass unknown options up to the parent parser if this
      // command is greedy, or if this is the root parser.
      onUnknownOption = () => false;
    }

    throw new Error('Not implemented');
  }

  static readonly default = new Parser();
}
