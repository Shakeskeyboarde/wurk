import { type Commander } from '../commander/commander.js';
import { Log, type LogOptions } from '../log.js';

export interface InitContextOptions {
  readonly main: string;
  readonly log?: LogOptions;
  readonly rootDir: string;
  readonly commander: Commander;
}

export class InitContext implements InitContextOptions {
  /**
   * Logger.
   */
  readonly log: Log;

  /**
   * Main filename of the command package.
   */
  readonly main: string;

  /**
   * Absolute path of the workspaces root.
   */
  readonly rootDir: string;

  /**
   * Configurable Commander command instance.
   */
  readonly commander: Commander;

  constructor({ main, log, rootDir, commander }: InitContextOptions) {
    this.main = main;
    this.log = new Log(log);
    this.rootDir = rootDir;
    this.commander = commander;
  }
}
