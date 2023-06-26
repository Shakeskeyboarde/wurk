import { type CommanderArgs, type CommanderOptions } from '../commander/commander.js';
import { type Spawn, spawn } from '../utils/spawn.js';
import { type WorkspacePartialOptions } from '../workspace/get-workspaces.js';
import { Workspace } from '../workspace/workspace.js';
import { BaseAsyncContext, type BaseAsyncContextOptions } from './base-async-context.js';

export interface EachContextOptions<A extends CommanderArgs, O extends CommanderOptions, M>
  extends BaseAsyncContextOptions<A, O> {
  readonly workspace: WorkspacePartialOptions;
  readonly matrixValue: M;
}

export class EachContext<A extends CommanderArgs, O extends CommanderOptions, M> extends BaseAsyncContext<A, O> {
  /**
   * The current workspace.
   */
  readonly workspace: Workspace;

  /**
   * A single value of the matrix returned by the `before` hook, or
   * undefined if the `before` hook did not return a matrix.
   */
  readonly matrixValue: M;

  constructor({
    workspace,
    matrixValue,
    gitHead,
    gitFromRevision,
    saveAndRestoreFile,
    ...superOptions
  }: EachContextOptions<A, O, M>) {
    super({ ...superOptions, gitHead, gitFromRevision, saveAndRestoreFile });

    this.workspace = new Workspace({ ...workspace, context: this, gitHead, gitFromRevision, saveAndRestoreFile });
    this.matrixValue = matrixValue;
  }

  /**
   * Spawn a child process at the current workspace root.
   */
  readonly spawn: Spawn = (cmd, args, options) => {
    return spawn(cmd, args, { cwd: this.workspace.dir, log: this.log, ...options });
  };
}
