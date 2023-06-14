import { type Command as Commander } from '@commander-js/extra-typings';

import { type CommandInfo } from '../command/load-command-plugin.js';
import { Log, type LogOptions } from '../utils/log.js';
import { BaseContext } from './base-context.js';

export interface InitContextOptions {
  readonly log?: LogOptions;
  readonly command: CommandInfo;
  readonly rootDir: string;
  readonly commander: Commander;
}

export class InitContext extends BaseContext {
  /**
   * Contextual logger.
   */
  readonly log: Log;

  /**
   * Information about the command package.
   */
  readonly command: CommandInfo;

  /**
   * Absolute path of the workspaces root.
   */
  readonly rootDir: string;

  /**
   * Configurable Commander command instance.
   */
  readonly commander: Commander;

  constructor({ log, command, rootDir, commander }: InitContextOptions) {
    super();
    this.log = new Log(log);
    this.command = command;
    this.rootDir = rootDir;
    this.commander = commander;
  }
}
