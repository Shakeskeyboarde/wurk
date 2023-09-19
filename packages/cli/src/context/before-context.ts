import { type CommanderArgs, type CommanderOptions } from '../commander/commander.js';
import { BaseAsyncContext, type BaseAsyncContextOptions } from './base-async-context.js';

export interface BeforeContextOptions<A extends CommanderArgs, O extends CommanderOptions>
  extends BaseAsyncContextOptions<A, O> {
  readonly forceWait: () => void;
}

export class BeforeContext<A extends CommanderArgs, O extends CommanderOptions> extends BaseAsyncContext<A, O> {
  /**
   * Force dependent workspaces to wait for their dependencies (ie. ignore
   * the CLI `--no-wait` option).
   */
  readonly forceWait: () => void;

  constructor({ forceWait, ...superOptions }: BeforeContextOptions<A, O>) {
    super(superOptions);

    this.forceWait = forceWait;
  }
}
