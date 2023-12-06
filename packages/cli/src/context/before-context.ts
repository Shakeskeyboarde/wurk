import { type CommanderArgs, type CommanderOptions } from '../commander/commander.js';
import { BaseAsyncContext, type BaseAsyncContextOptions } from './base-async-context.js';

export interface BeforeContextOptions<A extends CommanderArgs, O extends CommanderOptions>
  extends BaseAsyncContextOptions<A, O> {
  readonly onWaitForDependencies: (enabled: boolean) => void;
  readonly onPrintSummary: (enabled: boolean) => void;
}

export class BeforeContext<A extends CommanderArgs, O extends CommanderOptions> extends BaseAsyncContext<A, O> {
  /**
   * Enable or disable waiting for dependent workspace processing to
   * complete before processing dependent workspaces. The default is
   * `true`, which will ensure a dependent's dependencies are are
   * processed before the dependent itself is processed.
   *
   * Commands should generally disable this option when they are not
   * making any changes (ie. readonly, immutable).
   */
  readonly setWaitForDependencies: (enabled?: boolean) => void;

  /**
   * Enable or disable printing workspace status messages after the
   * command completes. The default is `false`.
   *
   * Commands should enable this option before using the
   * `workspace.setStatus()`.
   */
  readonly setPrintSummary: (enabled?: boolean) => void;

  constructor({ onWaitForDependencies, onPrintSummary, ...superOptions }: BeforeContextOptions<A, O>) {
    super(superOptions);

    this.setWaitForDependencies = (enabled = true) => onWaitForDependencies(enabled);
    this.setPrintSummary = (enabled = true) => onPrintSummary(enabled);
  }
}
