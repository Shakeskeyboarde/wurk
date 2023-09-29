import { type CommanderArgs, type CommanderOptions } from '../commander/commander.js';
import { BaseAsyncContext, type BaseAsyncContextOptions } from './base-async-context.js';

export interface BeforeContextOptions<A extends CommanderArgs, O extends CommanderOptions>
  extends BaseAsyncContextOptions<A, O> {
  readonly onWaitForDependencies: (enabled: boolean) => void;
}

export class BeforeContext<A extends CommanderArgs, O extends CommanderOptions> extends BaseAsyncContext<A, O> {
  /**
   * Enable or disable waiting for dependent workspace processing to
   * complete before processing dependent workspaces. The default is
   * `true`, which will ensure a dependent's dependencies are are
   * processed before the dependent itself is processed.
   *
   * Commands should generally only set this option when they are not
   * making any changes (ie. readonly, immutable).
   */
  readonly setWaitForDependencies: (enabled?: boolean) => void;

  constructor({ onWaitForDependencies, ...superOptions }: BeforeContextOptions<A, O>) {
    super(superOptions);

    this.setWaitForDependencies = (enabled = true) => onWaitForDependencies(enabled);
  }
}
