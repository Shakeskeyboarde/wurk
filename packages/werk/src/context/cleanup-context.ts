import { type CommandInfo } from '../command/load-command-plugin.js';
import { type CommanderArgs, type CommanderOptions } from '../commander/commander.js';
import { type SpawnSync, spawnSync } from '../utils/spawn-sync.js';
import { BaseContext, type BaseContextOptions } from './base-context.js';

export interface CleanupContextOptions<A extends CommanderArgs, O extends CommanderOptions> extends BaseContextOptions {
  readonly command: CommandInfo;
  readonly rootDir: string;
  readonly args: A;
  readonly opts: O;
  readonly exitCode: number;
}

export class CleanupContext<A extends CommanderArgs, O extends CommanderOptions> extends BaseContext {
  /**
   * Information about the command package.
   */
  readonly command: CommandInfo;

  /**
   * Absolute path of the workspaces root.
   */
  readonly rootDir: string;

  /**
   * Arguments parsed from the command line.
   */
  readonly args: A;

  /**
   * Options parsed from the command line.
   */
  readonly opts: O;

  /**
   * Exit code set by the command.
   */
  readonly exitCode: number;

  constructor({ log, config, command, rootDir, args, opts, exitCode }: CleanupContextOptions<A, O>) {
    super({ log, config });
    this.command = command;
    this.rootDir = rootDir;
    this.args = args;
    this.opts = opts;
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
    this._assertMethodCallsAllowed('spawn');
    return spawnSync(cmd, args, { cwd: this.rootDir, log: this.log, ...options });
  };
}
