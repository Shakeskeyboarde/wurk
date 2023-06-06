import { type CommandPackage } from '../command/loaded-command.js';
import { type Commander } from '../commander/commander.js';
import { Log, type LogOptions } from '../utils/log.js';

export interface InitContextOptions {
  readonly log?: LogOptions;
  readonly command: CommandPackage;
  readonly rootDir: string;
  readonly commander: Commander;
}

export class InitContext implements InitContextOptions {
  /**
   * Logger.
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
   * Configurable Commander command instance.
   */
  readonly commander: Commander;

  constructor({ log, command, rootDir, commander }: InitContextOptions) {
    this.log = new Log(log);
    this.command = command;
    this.rootDir = rootDir;
    this.commander = commander;
  }
}
