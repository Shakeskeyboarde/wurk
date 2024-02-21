import fs from 'node:fs';
import path from 'node:path';

import { type Log, log as defaultLog } from '@wurk/log';

interface PinOptions {
  readonly log?: Log;
  readonly dir: string;
}

export class Pin {
  #tempDir: string | undefined;

  readonly #log: Log;
  readonly #dir: string;
  readonly #pinned = new Map<string, string | true>();

  constructor({ log = defaultLog, dir }: PinOptions) {
    this.#log = log;
    this.#dir = dir;
  }

  /**
   * Save the state of a file so that it can be restored later.
   */
  pinFile = (filename: string): void => {
    const from = path.resolve(this.#dir, filename);

    /**
     * File is already pinned, so there's nothing to do.
     */
    if (this.#pinned.has(from)) return;

    let tempDir = this.#tempDir;

    if (tempDir == null) {
      tempDir = this.#tempDir = fs.mkdtempSync('wurk-pinned-files-');
      process.on('exit', () => this._restoreAllPinnedFiles());
    }

    const to = path.resolve(tempDir, path.relative(this.#dir, from));

    if (to.startsWith('..')) {
      throw new Error(`pinned file "${from}" is outside of the root directory`);
    }

    try {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.cpSync(from, to, {
        preserveTimestamps: true,
        verbatimSymlinks: true,
      });

      this.#pinned.set(from, to);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        this.#pinned.set(from, true);
      } else {
        throw error;
      }
    }

    this.#log.debug(`pinned file "${from}"`);
  };

  /**
   * Restore a single file to it's pinned state. Returns false if the file was
   * not pinned, which makes restoring a no-op.
   */
  protected _restoreFile = (filename: string): void => {
    const from = path.resolve(this.#dir, filename);
    const to = this.#pinned.get(from);

    // File was not pinned, so this is a no-op.
    if (!to) return;

    try {
      if (typeof to === 'string') {
        fs.mkdirSync(path.dirname(from), { recursive: true });
        fs.cpSync(to, from, {
          preserveTimestamps: true,
          verbatimSymlinks: true,
        });
      } else {
        fs.rmSync(from, { recursive: true, force: true });
      }
    } catch (error) {
      this.#log.error(`failed to restore pinned file "${from}":`);
      this.#log.error(error);
      return;
    }

    this.#pinned.delete(from);
    this.#log.debug(`restored pinned file "${from}"`);
  };

  /**
   * Restore all pinned files to their pinned states.
   */
  protected _restoreAllPinnedFiles = (): void => {
    for (const from of this.#pinned.keys()) {
      this._restoreFile(from);
    }

    if (this.#tempDir) {
      try {
        fs.rmSync(this.#tempDir, { recursive: true, force: true });
      } catch (error) {
        this.#log.error(`failed to remove temp directory "${this.#tempDir}":`);
        this.#log.error(error);
      }

      this.#tempDir = undefined;
    }
  };
}
