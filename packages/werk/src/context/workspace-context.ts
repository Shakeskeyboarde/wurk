import { type CommanderArgs, type CommanderOptions } from '../commander/commander.js';
import { type Spawn, spawn } from '../utils/spawn.js';
import { Workspace, type WorkspaceOptions } from '../workspace/workspace.js';
import { RootContext, type RootContextOptions } from './root-context.js';

export interface WorkspaceContextOptions<A extends CommanderArgs, O extends CommanderOptions>
  extends RootContextOptions<A, O> {
  readonly workspace: WorkspaceOptions;
}

export class WorkspaceContext<A extends CommanderArgs, O extends CommanderOptions> extends RootContext<A, O> {
  /**
   * The current workspace.
   */
  readonly workspace: Workspace;

  /**
   * Copy constructor.
   */
  constructor({ workspace, ...superOptions }: WorkspaceContextOptions<A, O>) {
    super(superOptions);

    this.workspace = new Workspace(workspace);
  }

  /**
   * Spawn a child process at the workspaces root.
   */
  readonly spawn: Spawn = (cmd, args, options) => {
    return spawn(cmd, args, { cwd: this.workspace.dir, log: this.log, ...options });
  };
}
