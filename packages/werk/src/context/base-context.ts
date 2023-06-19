import { type Plugin } from '../utils/load-plugin.js';
import { Log, type LogOptions } from '../utils/log.js';

export interface CommandInfo extends Omit<Plugin, 'exports'> {
  name: string;
}

export interface BaseContextOptions {
  readonly log: LogOptions | undefined;
  readonly command: CommandInfo;
  readonly config: unknown;
}

export abstract class BaseContext {
  #isDestroyed = false;

  /**
   * Contextual logger.
   */
  readonly log: Log;

  /**
   * Information about the command package.
   */
  readonly command: CommandInfo;

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

  get isDestroyed(): boolean {
    return this.#isDestroyed;
  }

  constructor({ log, command, config }: BaseContextOptions) {
    this.log = new Log(log);
    this.command = command;
    this.config = config;
  }

  readonly destroy = (): void => {
    this.#isDestroyed = true;
    this.log.destroy();
  };

  protected readonly _assertMethodCallsAllowed = (method: string): void => {
    if (this.isDestroyed) throw new Error(`Method "${method}" called on destroyed context.`);
  };
}
