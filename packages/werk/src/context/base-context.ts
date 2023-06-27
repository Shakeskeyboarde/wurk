import { type PackageManager } from '../config.js';
import { type Plugin } from '../utils/load-plugin.js';
import { Log, type LogOptions } from '../utils/log.js';

export interface CommandInfo extends Omit<Plugin, 'exports'> {
  readonly name: string;
}

export interface BaseContextOptions {
  readonly log: LogOptions | undefined;
  readonly command: CommandInfo;
  readonly packageManager: PackageManager;
  readonly config: unknown;
}

export abstract class BaseContext {
  /**
   * Contextual logger.
   */
  readonly log: Log;

  /**
   * Information about the command package.
   */
  readonly command: CommandInfo;

  /**
   * The package manager used by the monorepo. Currently only `npm` is
   * supported.
   */
  readonly packageManager: PackageManager;

  /**
   * Command configuration from the workspaces root `package.json` file.
   *
   * ```json
   * {
   *   "werk": {
   *     <command>: {
   *       "config": <value>
   *     }
   *   }
   * }
   * ```
   */
  readonly config: unknown;

  constructor({ log, command, packageManager, config }: BaseContextOptions) {
    this.log = new Log(log);
    this.command = command;
    this.packageManager = packageManager;
    this.config = config;
  }
}
