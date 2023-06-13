import { type CommanderArgs, type CommanderOptions } from '../commander/commander.js';
import { BaseAsyncContext, type BaseAsyncContextOptions } from './base-async-context.js';

export interface BeforeContextOptions<A extends CommanderArgs, O extends CommanderOptions>
  extends BaseAsyncContextOptions<A, O> {
  readonly forceWait: () => void;
}

export class BeforeContext<
  A extends CommanderArgs = CommanderArgs,
  O extends CommanderOptions = CommanderOptions,
> extends BaseAsyncContext<A, O> {
  /**
   * Force the command line `--wait` option. Dependent workspace
   * processing will wait for dependency workspaces to complete
   * successfully before starting.
   *
   * **NOTE:** This method is only supported in the main thread.
   */
  readonly forceWait: () => void;

  constructor({ forceWait, ...superOptions }: BeforeContextOptions<A, O>) {
    super(superOptions);

    this.forceWait = forceWait;
  }
}
