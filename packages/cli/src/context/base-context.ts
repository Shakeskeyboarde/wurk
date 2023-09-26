import { type CommanderArgs, type CommanderOptions } from '../commander/commander.js';
import { Log, type LogOptions } from '../utils/log.js';

export interface BaseContextOptions<A extends CommanderArgs, O extends CommanderOptions> {
  readonly log: LogOptions | undefined;
  readonly args: A;
  readonly opts: O;
}

export abstract class BaseContext<A extends CommanderArgs, O extends CommanderOptions> {
  #destroy: (() => void)[] = [];

  /**
   * Contextual logger.
   */
  readonly log: Log;

  /**
   * Arguments parsed from the command line.
   */
  readonly args: A;

  /**
   * Options parsed from the command line.
   */
  readonly opts: O;

  constructor({ log, args, opts }: BaseContextOptions<A, O>) {
    this.log = new Log(log);
    this.args = args;
    this.opts = opts;
    this.destroy = this.destroy.bind(this);
    this.onDestroy = this.onDestroy.bind(this);
  }

  destroy(): void {
    this.#destroy.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        this.log.error(error);
      }
    });
  }

  protected onDestroy(callback: () => void): void {
    this.#destroy.unshift(callback);
  }
}
