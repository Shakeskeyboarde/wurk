import { type CommanderArgs, type CommanderOptions } from '../commander/commander.js';
import { BaseAsyncContext, type BaseAsyncContextOptions } from './base-async-context.js';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AfterContextOptions<A extends CommanderArgs, O extends CommanderOptions>
  extends BaseAsyncContextOptions<A, O> {}

export class AfterContext<A extends CommanderArgs, O extends CommanderOptions> extends BaseAsyncContext<A, O> {
  constructor({ ...superOptions }: AfterContextOptions<A, O>) {
    super(superOptions);
  }
}
