import { type CommandState } from './types/command-state.js';
import { type ArgsErrorType } from './types/error.js';
import { type ProgramType } from './types/program.js';
import { type ProgramRunOptions } from './types/program-run-options.js';
import { type Result } from './types/result.js';
import { type ResultSubcommand } from './types/result-subcommand.js';

export class Program<TCommand extends CommandState<any, any, any, any, any>> implements ProgramType<TCommand> {
  readonly command;
  readonly options;
  readonly positional;
  readonly extra;
  readonly subcommand: ResultSubcommand<TCommand>;

  constructor(result: Result<TCommand>) {
    this.command = result.command;
    this.options = result.options;
    this.positional = result.positional;
    this.extra = result.extra;
    this.subcommand = result.subcommand;
  }

  get name(): TCommand['name'] {
    return this.command.name;
  }

  run(options: ProgramRunOptions = {}): Promise<null | ArgsErrorType> {
    const { errorAction = 'exit', printHelpOnError = false } = options;

    throw new Error('Not implemented');
  }
}
