import { type CommandState } from './command-state.js';

export interface HelpType {
  format(command: CommandState<any, any, any, any, any>, error: Error | null): string;
}
