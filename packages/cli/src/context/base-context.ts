import { type PackageManager } from '../config.js';
import { Log, type LogOptions } from '../utils/log.js';

export interface BaseContextOptions {
  readonly log: LogOptions | undefined;
  readonly packageManager: PackageManager;
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

  constructor({ log, packageManager }: BaseContextOptions) {
    this.log = new Log(log);
    this.packageManager = packageManager;
  }
}
