import { type CommandPackage } from '../command/load-command.js';
import { type CommanderArgs, type CommanderOptions } from '../commander/commander.js';
import { Log, type LogOptions } from '../utils/log.js';

export interface CleanupContextOptions<A extends CommanderArgs, O extends CommanderOptions> {
  readonly log?: LogOptions;
  readonly command: CommandPackage;
  readonly rootDir: string;
  readonly args: A;
  readonly opts: O;
  readonly exitCode: number;
}

export class CleanupContext<A extends CommanderArgs, O extends CommanderOptions>
  implements CleanupContextOptions<A, O>
{
  /**
   * Contextual logger.
   */
  readonly log: Log;

  /**
   * Information about the command package.
   */
  readonly command: CommandPackage;

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

  constructor({ log, command, rootDir, args, opts, exitCode }: CleanupContextOptions<A, O>) {
    this.log = new Log(log);
    this.command = command;
    this.rootDir = rootDir;
    this.args = args;
    this.opts = opts;
    this.exitCode = exitCode;
  }
}
