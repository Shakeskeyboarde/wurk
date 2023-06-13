import { type CommanderArgs, type CommanderOptions } from '../commander/commander.js';
import { type Spawn, spawn } from '../utils/spawn.js';
import { Workspace, type WorkspaceOptions } from '../workspace/workspace.js';
import { BaseAsyncContext, type BaseAsyncContextOptions } from './base-async-context.js';

export interface EachContextOptions<A extends CommanderArgs, O extends CommanderOptions>
  extends BaseAsyncContextOptions<A, O> {
  readonly workspace: WorkspaceOptions;
}

export class EachContext<
  A extends CommanderArgs = CommanderArgs,
  O extends CommanderOptions = CommanderOptions,
> extends BaseAsyncContext<A, O> {
  /**
   * The current workspace.
   */
  readonly workspace: Workspace;

  constructor({ workspace, gitHead, gitFromRevision, backupFile, ...superOptions }: EachContextOptions<A, O>) {
    super({ ...superOptions, gitHead, gitFromRevision, backupFile });

    this.workspace = new Workspace({ ...workspace, context: this, gitHead, gitFromRevision, backupFile });
  }

  /**
   * Spawn a child process at the current workspace root.
   */
  readonly spawn: Spawn = (cmd, args, options) => {
    this._assertMethodCallsAllowed('spawn');
    return spawn(cmd, args, { cwd: this.workspace.dir, log: this.log, ...options });
  };
}
