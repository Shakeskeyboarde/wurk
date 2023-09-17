import { type PackageManager } from '../config.js';
import { Log, type LogOptions } from '../utils/log.js';

export interface BaseContextOptions {
  readonly log: LogOptions | undefined;
  readonly packageManager: PackageManager;
  readonly config: unknown;
}

export abstract class BaseContext {
  /**
   * Contextual logger.
   */
  readonly log: Log;

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

  constructor({ log, packageManager, config }: BaseContextOptions) {
    this.log = new Log(log);
    this.packageManager = packageManager;
    this.config = config;
  }
}
