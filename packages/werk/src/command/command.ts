/* eslint-disable max-lines */
import { randomUUID } from 'node:crypto';
import { unlinkSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { isMainThread, parentPort } from 'node:worker_threads';

import { type Command as Commander } from '@commander-js/extra-typings';

import { type CommanderArgs, type CommanderOptions } from '../commander/commander.js';
import { type PackageManager } from '../config.js';
import { AfterContext, type AfterContextOptions } from '../context/after-context.js';
import { BeforeContext, type BeforeContextOptions } from '../context/before-context.js';
import { CleanupContext, type CleanupContextOptions } from '../context/cleanup-context.js';
import { EachContext, type EachContextOptions } from '../context/each-context.js';
import { InitContext, type InitContextOptions } from '../context/init-context.js';
import { type Log, log } from '../utils/log.js';
import { startWorker, type WorkerOptions, type WorkerPromise } from '../utils/start-worker.js';

type FunctionKeys<T> = { [K in keyof T]-?: T[K] extends Function ? K : never }[keyof T];

export type BeforeOptions<A extends CommanderArgs, O extends CommanderOptions> = Omit<
  BeforeContextOptions<A, O>,
  FunctionKeys<BeforeContextOptions<CommanderArgs, CommanderOptions>>
>;
export type EachOptions<A extends CommanderArgs, O extends CommanderOptions, M> = Omit<
  EachContextOptions<A, O, M>,
  FunctionKeys<EachContextOptions<CommanderArgs, CommanderOptions, unknown>>
>;
export type AfterOptions<A extends CommanderArgs, O extends CommanderOptions> = Omit<
  AfterContextOptions<A, O>,
  FunctionKeys<AfterContextOptions<CommanderArgs, CommanderOptions>>
>;

export interface CommandHooks<A extends CommanderArgs, O extends CommanderOptions, M> {
  /**
   * The package managers supported by the command, or false if the
   * command does not depend on any package manager.
   **/
  readonly packageManager: readonly [PackageManager, ...PackageManager[]] | false;

  /**
   * Called when the command is loaded. Intended for configuration of
   * command options, arguments, and help text.
   */
  readonly init?: (context: InitContext) => Commander<A, O>;
  /**
   * Run once before handling individual workspaces. This hook can also
   * return an array of values which will be used as a "matrix" when
   * running the `each` hook. The `each` hook will run once for every
   * workspace and matrix value combination.
   */
  readonly before?: (context: BeforeContext<A, O>) => Promise<void | undefined | M[]>;
  /**
   * Run once for each workspace.
   */
  readonly each?: (context: EachContext<A, O, M>) => Promise<void>;
  /**
   * Run once after handling individual workspaces.
   */
  readonly after?: (context: AfterContext<A, O>) => Promise<void>;
  /**
   * Run once after all other hooks. This is the last chance to perform
   * cleanup, and it must be synchronous.
   */
  readonly cleanup?: (context: CleanupContext<A, O>) => void | undefined;
}

const COMMAND = Symbol('WerkCommand');

export class Command<A extends CommanderArgs, O extends CommanderOptions, M> {
  readonly #init: ((context: InitContext) => Commander<A, O>) | undefined;
  readonly #before: ((context: BeforeContext<A, O>) => Promise<void | undefined | M[]>) | undefined;
  readonly #each: ((context: EachContext<A, O, M>) => Promise<void>) | undefined;
  readonly #after: ((context: AfterContext<A, O>) => Promise<void>) | undefined;
  readonly #cleanup: ((context: CleanupContext<A, O>) => void) | undefined;
  readonly #fileBackups: { filename: string; content: Buffer | null }[] = [];

  readonly packageManager: readonly [PackageManager, ...PackageManager[]] | false;

  isWaitForced = false;

  constructor({ packageManager, init, before, each, after, cleanup }: CommandHooks<A, O, M>) {
    Object.assign(this, { [COMMAND]: true });
    this.packageManager = packageManager;
    this.#init = init;
    this.#before = before;
    this.#each = each;
    this.#after = after;
    this.#cleanup = cleanup;

    process.setMaxListeners(process.getMaxListeners() + 1);
    process.on('exit', this.#restoreBackupFiles);
  }

  readonly init = (options: InitContextOptions): Commander<any, any> => {
    log.silly('init()');
    if (!this.#init) return options.commander;

    const context = new InitContext(options);

    try {
      return this.#init(context) as Commander<any, any>;
    } catch (error) {
      context.log.error(error instanceof Error ? error.message : `${error}`);
      process.exitCode = process.exitCode || 1;
    }

    return options.commander;
  };

  readonly before = async (options: BeforeOptions<A, O>): Promise<void | undefined | M[]> => {
    log.silly('before()');

    if (!this.#before) return;

    const context = new BeforeContext({
      ...options,
      isWorker: !isMainThread,
      workerData: undefined,
      forceWait: this.#forceWait,
      saveAndRestoreFile: this.#saveAndRestoreFile,
      startWorker: (data) =>
        this.#startWorker(options.command.main, { workerData: { stage: 'before', options, data } }),
    });

    return await this.#before(context).catch((error) => {
      context.log.error(error instanceof Error ? error.message : `${error}`);
      process.exitCode = process.exitCode || 1;
    });
  };

  readonly each = async (options: EachOptions<A, O, M>): Promise<void> => {
    log.silly(`each('${options.workspace.name}')`);

    if (!this.#each) return;

    const context = new EachContext({
      ...options,
      isWorker: !isMainThread,
      workerData: undefined,
      saveAndRestoreFile: this.#saveAndRestoreFile,
      startWorker: (data) => this.#startWorker(options.command.main, { workerData: { stage: 'each', options, data } }),
    });

    await this.#each(context).catch((error) => {
      context.log.error(error instanceof Error ? error.message : `${error}`);
      process.exitCode = process.exitCode || 1;
    });
  };

  readonly after = async (options: AfterOptions<A, O>): Promise<void> => {
    log.silly('after()');

    if (!this.#after) return;

    const context = new AfterContext({
      ...options,
      isWorker: !isMainThread,
      workerData: undefined,
      saveAndRestoreFile: this.#saveAndRestoreFile,
      startWorker: (data) => this.#startWorker(options.command.main, { workerData: { stage: 'after', options, data } }),
    });

    await this.#after(context).catch((error) => {
      context.log.error(error instanceof Error ? error.message : `${error}`);
      process.exitCode = process.exitCode || 1;
    });
  };

  readonly cleanup = (options: CleanupContextOptions<A, O>): void => {
    log.silly('cleanup()');

    if (!this.#cleanup) return;

    const context = new CleanupContext(options);

    try {
      this.#cleanup(context);
      process.off('exit', this.#restoreBackupFiles);
      process.setMaxListeners(process.getMaxListeners() - 1);
      this.#restoreBackupFiles(context.log);
    } catch (error) {
      context.log.error(error instanceof Error ? error.message : `${error}`);
      process.exitCode = process.exitCode || 1;
    }
  };

  #forceWait = (): void => {
    this.isWaitForced = true;

    if (parentPort) {
      parentPort.postMessage({ type: 'forceWait' });
    }
  };

  #saveAndRestoreFile = async (filename: string): Promise<void> => {
    if (parentPort) {
      const port = parentPort;

      return await new Promise((resolve, reject) => {
        const id = randomUUID();
        const onResponse = (message: any): void => {
          if (message?.type === id) {
            port.off('message', onResponse);

            if (message?.error != null) {
              reject(new Error(message?.error?.message ?? String(message?.error)));
            }

            resolve();
          }
        };

        port.on('message', onResponse);
        port.postMessage({ type: 'saveAndRestoreFile', filename, id });
      });
    }

    const content = await readFile(filename).catch((error) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });

    this.#fileBackups.unshift({ filename, content });
  };

  #restoreBackupFiles = (log_: Log): void => {
    for (const fileBackup of this.#fileBackups) {
      log.silly(`restore('${fileBackup.filename}')`);

      if (fileBackup.content == null) {
        try {
          unlinkSync(fileBackup.filename);
        } catch (error) {
          if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
            log_.error(error);
            log_.warn(`Failed to restore "${fileBackup.filename}" (unlink).`);
          }
        }
      } else {
        try {
          writeFileSync(fileBackup.filename, fileBackup.content);
        } catch (error) {
          log_.error(error);
          log_.warn(`Failed to restore "${fileBackup.filename}" (write).`);
        }
      }
    }
  };

  #startWorker = (filename: string, options?: WorkerOptions): WorkerPromise => {
    const workerPromise = startWorker(filename, options);

    workerPromise.worker?.on('message', (message) => {
      switch (message?.type) {
        case 'forceWait':
          this.isWaitForced = true;
          break;
        case 'saveAndRestoreFile':
          this.#saveAndRestoreFile(message.filename)
            .then(() => workerPromise.worker.postMessage({ type: message.id }))
            .catch((error) => workerPromise.worker.postMessage({ type: message.id, error }));
          break;
      }
    });

    return workerPromise;
  };
}

export const isCommand = (value: unknown): value is Command<any, any, any> => {
  return (value as any)?.[COMMAND] === true;
};
