import { type Command as Commander } from '@commander-js/extra-typings';

import { BaseContext, type BaseContextOptions } from './base-context.js';

export interface InitContextOptions extends BaseContextOptions {
  readonly rootDir: string;
  readonly commander: Commander;
}

export class InitContext extends BaseContext {
  /**
   * Absolute path of the workspaces root.
   */
  readonly rootDir: string;

  /**
   * Configurable Commander command instance.
   */
  readonly commander: Commander;

  constructor({ log, command, config, rootDir, commander }: InitContextOptions) {
    super({ log, command, config });

    this.rootDir = rootDir;
    this.commander = commander;
  }
}
