import { type Command as Commander } from '@commander-js/extra-typings';

import { type CommandInfo } from '../command/load-command-plugin.js';
import { BaseContext, type BaseContextOptions } from './base-context.js';

export interface InitContextOptions extends BaseContextOptions {
  readonly command: CommandInfo;
  readonly rootDir: string;
  readonly commander: Commander;
}

export class InitContext extends BaseContext {
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

  constructor({ log, config, command, rootDir, commander }: InitContextOptions) {
    super({ log, config });

    this.command = command;
    this.rootDir = rootDir;
    this.commander = commander;
  }
}
