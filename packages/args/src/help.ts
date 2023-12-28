import { type CommandState } from './types/command-state.js';
import { type HelpType } from './types/help.js';

export class Help implements HelpType {
  format(command: CommandState<any, any, any, any, any>, error: Error | null): string {
    throw new Error('Not implemented');
  }

  /**
   * Default singleton Help instance.
   */
  static readonly default = new Help();
}
