import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import { type CommanderArgs, type CommanderOptions } from '../commander/commander.js';
import { type ReadonlyEnhancedMap } from '../utils/enhanced-map.js';
import { spawn, type SpawnOptions, type SpawnPromise } from '../utils/spawn.js';
import { type Workspace } from '../workspace/workspace.js';
import { BaseContext, type BaseContextOptions } from './base-context.js';

export interface BaseAsyncContextOptions<A extends CommanderArgs, O extends CommanderOptions>
  extends BaseContextOptions<A, O> {
  readonly root: Workspace;
  readonly workspaces: ReadonlyEnhancedMap<string, Workspace>;
}

export abstract class BaseAsyncContext<A extends CommanderArgs, O extends CommanderOptions> extends BaseContext<A, O> {
  #tempDir: string | undefined;
  readonly #saved = new Set<string>();

  /**
   * The workspaces root workspace.
   */
  readonly root: Workspace;

  /**
   * Map of all NPM workspaces in order of interdependency (dependencies
   * before dependents).
   */
  readonly workspaces: ReadonlyEnhancedMap<string, Workspace>;

  constructor({ log, args, opts, root, workspaces }: BaseAsyncContextOptions<A, O>) {
    super({ log, args, opts });

    this.root = root;
    this.workspaces = workspaces;

    this.spawn = this.spawn.bind(this);
    this.saveAndRestoreFile = this.saveAndRestoreFile.bind(this);
  }

  /**
   * Spawn a child process at the workspaces root.
   */
  spawn(
    cmd: string,
    args?: readonly (string | number | false | null | undefined)[],
    options?: SpawnOptions,
  ): SpawnPromise {
    return spawn(cmd, args, { cwd: this.root.dir, log: this.log, ...options });
  }

  saveAndRestoreFile(...pathParts: string[]): void {
    if (!this.#tempDir) {
      const dir = (this.#tempDir = mkdtempSync('werk-save-and-restore-'));

      this.onDestroy(() => {
        rmSync(dir, { recursive: true, force: true });
      });
    }

    const from = resolve(this.root.dir, ...pathParts);

    if (this.#saved.has(from)) return;

    const to = resolve(this.#tempDir, relative(this.root.dir, from));

    try {
      // Copy it to the temp directory.
      cpSync(from, to, {
        errorOnExist: true,
        preserveTimestamps: true,
        verbatimSymlinks: true,
      });

      this.log.debug(`Marked "${from}" for restoration.`);

      // Copy it back to the original location.
      this.onDestroy(() => {
        cpSync(to, from, {
          force: true,
          preserveTimestamps: true,
          verbatimSymlinks: true,
        });
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        this.log.debug(`Marked "${from}" for deletion.`);

        /*
         * File does not exist, so the restore action will be to delete
         * it if it exists later.
         */
        this.onDestroy(() => {
          rmSync(from, { force: true });
        });

        return;
      }

      throw error;
    }

    this.#saved.add(from);
  }
}
