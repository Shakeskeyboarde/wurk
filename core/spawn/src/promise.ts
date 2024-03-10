import { type JsonAccessor } from '@wurk/json';

import { SpawnExitCodeError } from './error.js';
import { type SpawnResult } from './result.js';

export class SpawnPromise extends Promise<SpawnResult> {
  constructor(promise: Promise<SpawnResult>) {
    super((resolve, reject) => {
      promise.then(resolve, reject);
    });
  }

  /**
   * Do this or the above promise constructor will be invoked for then/catch
   * chaining and it will break because the constructor does not match the
   * base Promise constructor.
   */
  static [Symbol.species] = Promise;

  async stdout(): Promise<Buffer> {
    return await this.then((result) => result.stdout);
  }

  async stdoutText(): Promise<string> {
    return await this.then((result) => result.stdoutText);
  }

  async stdoutJson(): Promise<JsonAccessor> {
    return await this.then((result) => result.stdoutJson);
  }

  async stderr(): Promise<Buffer> {
    return await this.then((result) => result.stderr);
  }

  async stderrText(): Promise<string> {
    return await this.then((result) => result.stderrText);
  }

  async stderrJson(): Promise<JsonAccessor> {
    return await this.then((result) => result.stderrJson);
  }

  async combined(): Promise<Buffer> {
    return await this.then((result) => result.combined);
  }

  async combinedText(): Promise<string> {
    return await this.then((result) => result.combinedText);
  }

  async exitCode(): Promise<number> {
    return await this.then((result) => result.exitCode)
      .catch((error: unknown) => {
        if (!(error instanceof SpawnExitCodeError)) throw error;
        return error.exitCode;
      });
  }

  async signalCode(): Promise<NodeJS.Signals | null> {
    return await this.then((result) => result.signalCode)
      .catch((error: unknown) => {
        if (!(error instanceof SpawnExitCodeError)) throw error;
        return error.signalCode;
      });
  }

  async ok(): Promise<boolean> {
    return await this.then((result) => result.ok)
      .catch((error: unknown) => {
        if (!(error instanceof SpawnExitCodeError)) throw error;
        return false;
      });
  }
}
