import { type Log } from '../utils/log.js';

export abstract class BaseContext {
  #isDestroyed = false;

  abstract readonly log: Log;

  get isDestroyed(): boolean {
    return this.#isDestroyed;
  }

  readonly destroy = (): void => {
    this.#isDestroyed = true;
    this.log.destroy();
  };

  protected readonly _assertMethodCallsAllowed = (method: string): void => {
    if (this.isDestroyed) throw new Error(`Method "${method}" called on destroyed context.`);
  };
}
