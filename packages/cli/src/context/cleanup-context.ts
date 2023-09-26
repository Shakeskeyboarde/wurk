import { type CommanderArgs, type CommanderOptions } from '../commander/commander.js';
import { type SpawnSync, spawnSync } from '../utils/spawn-sync.js';
import { BaseContext, type BaseContextOptions } from './base-context.js';

export interface CleanupContextOptions<A extends CommanderArgs, O extends CommanderOptions>
  extends BaseContextOptions<A, O> {
  readonly rootDir: string;
  readonly exitCode: number;
}

export class CleanupContext<A extends CommanderArgs, O extends CommanderOptions> extends BaseContext<A, O> {
  /**
   * Absolute path of the workspaces root.
   */
  readonly rootDir: string;

  /**
   * Exit code set by the command.
   */
  readonly exitCode: number;

  constructor({ log, args, opts, rootDir, exitCode }: CleanupContextOptions<A, O>) {
    super({ log, args, opts });

    this.rootDir = rootDir;
    this.exitCode = exitCode;
  }

  /**
   * Spawn a child process at the workspaces root.
   *
   * Unlike the `spawn` method in the `before`, `each`, and `after`
   * contexts, this method is synchronous. The output cannot be streamed,
   * and stdio (combined stdout and stderr) is not available.
   */
  readonly spawn: SpawnSync = (cmd, args, options) => {
    return spawnSync(cmd, args, { cwd: this.rootDir, log: this.log, ...options });
  };
}
