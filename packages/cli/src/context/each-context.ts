import { type CommanderArgs, type CommanderOptions } from '../commander/commander.js';
import { type Spawn } from '../utils/spawn.js';
import { type Workspace } from '../workspace/workspace.js';
import { BaseAsyncContext, type BaseAsyncContextOptions } from './base-async-context.js';

export interface EachContextOptions<A extends CommanderArgs, O extends CommanderOptions, M>
  extends BaseAsyncContextOptions<A, O> {
  readonly isParallel: boolean;
  readonly workspace: Workspace;
  readonly matrixValue: M;
}

export class EachContext<A extends CommanderArgs, O extends CommanderOptions, M> extends BaseAsyncContext<A, O> {
  /**
   * True if the command is running in parallel mode.
   */
  readonly isParallel: boolean;

  /**
   * The current workspace.
   */
  readonly workspace: Workspace;

  /**
   * A single value of the matrix returned by the `before` hook, or
   * undefined if the `before` hook did not return a matrix.
   */
  readonly matrixValue: M;

  constructor({ isParallel, workspace, matrixValue, ...superOptions }: EachContextOptions<A, O, M>) {
    super(superOptions);

    this.isParallel = isParallel;
    this.workspace = workspace;
    this.matrixValue = matrixValue;
  }

  readonly spawn: Spawn = (cmd, args, options) => {
    return super.spawn(cmd, args, { log: this.log, ...options });
  };
}
