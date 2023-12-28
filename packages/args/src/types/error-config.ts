import { type CommandState } from './command-state.js';
import { type ArgsErrorCode } from './error-code.js';

export interface ArgsErrorConfig extends ErrorOptions {
  readonly command: CommandState<any, any, any, any, any>;
  readonly code: ArgsErrorCode;
}
