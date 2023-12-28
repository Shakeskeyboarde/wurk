import { type CommandState } from './command-state.js';
import { type ArgsErrorType } from './error.js';
import { type ProgramRunOptions } from './program-run-options.js';
import { type Result } from './result.js';

export interface ProgramType<TCommand extends CommandState<any, any, any, any, any>> extends Result<TCommand> {
  /**
   * Run the actions defined by the commands which produced this program.
   */
  run(options?: ProgramRunOptions): Promise<null | ArgsErrorType>;
}
