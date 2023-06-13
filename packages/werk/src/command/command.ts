import { randomUUID } from 'node:crypto';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { isMainThread, parentPort } from 'node:worker_threads';

import { type Commander, type CommanderArgs, type CommanderOptions } from '../commander/commander.js';
import { AfterContext, type AfterContextOptions } from '../context/after-context.js';
import { BeforeContext, type BeforeContextOptions } from '../context/before-context.js';
import { CleanupContext, type CleanupContextOptions } from '../context/cleanup-context.js';
import { EachContext, type EachContextOptions } from '../context/each-context.js';
import { InitContext, type InitContextOptions } from '../context/init-context.js';
import { type Log } from '../utils/log.js';
import { startWorker, type WorkerOptions, type WorkerPromise } from '../utils/start-worker.js';

type FunctionKeys<T> = { [K in keyof T]: T[K] extends Function ? K : never }[keyof T];

export type BeforeOptions<A extends CommanderArgs, O extends CommanderOptions> = Omit<
  BeforeContextOptions<A, O>,
  FunctionKeys<BeforeContextOptions<CommanderArgs, CommanderOptions>>
>;
export type EachOptions<A extends CommanderArgs, O extends CommanderOptions> = Omit<
  EachContextOptions<A, O>,
  FunctionKeys<EachContextOptions<CommanderArgs, CommanderOptions>>
>;
export type AfterOptions<A extends CommanderArgs, O extends CommanderOptions> = Omit<
  AfterContextOptions<A, O>,
  FunctionKeys<AfterContextOptions<CommanderArgs, CommanderOptions>>
>;

export interface CommandHooks<A extends CommanderArgs, O extends CommanderOptions, AA extends A = A, OO extends O = O> {
  /**
   * Called when the command is loaded. Intended for configuration of
   * command options, arguments, and help text.
   */
  readonly init?: (context: InitContext) => Commander<A, O>;
  /**
   * Run once before handling individual workspaces.
   */
  readonly before?: (context: BeforeContext<AA, OO>) => Promise<void>;
  /**
   * Run once for each workspace.
   */
  readonly each?: (context: EachContext<AA, OO>) => Promise<void>;
  /**
   * Run once after handling individual workspaces.
   */
  readonly after?: (context: AfterContext<AA, OO>) => Promise<void>;
  /**
   * Run once after all other hooks. This is the last chance to perform
   * cleanup, and it must be synchronous.
   */
  readonly cleanup?: (context: CleanupContext<AA, OO>) => void | undefined;
}

export interface CommandType<A extends CommanderArgs, O extends CommanderOptions> {
  isWaitForced: boolean;
  readonly init: (options: InitContextOptions) => Commander<any, any>;
  readonly before: (options: BeforeOptions<A, O>) => Promise<void>;
  readonly each: (options: EachOptions<A, O>) => Promise<void>;
  readonly after: (options: AfterOptions<A, O>) => Promise<void>;
  readonly cleanup: (context: CleanupContextOptions<A, O>) => void;
}

const COMMAND = Symbol('WerkCommand');

export class Command<A extends CommanderArgs, O extends CommanderOptions> implements CommandType<A, O> {
  readonly #init: ((context: InitContext) => Commander<A, O>) | undefined;
  readonly #before: ((context: BeforeContext<A, O>) => Promise<void>) | undefined;
  readonly #each: ((context: EachContext<A, O>) => Promise<void>) | undefined;
  readonly #after: ((context: AfterContext<A, O>) => Promise<void>) | undefined;
  readonly #cleanup: ((context: CleanupContext<A, O>) => void) | undefined;
  readonly #fileBackups: { filename: string; content: Buffer | null }[] = [];

  isWaitForced = false;

  constructor({ init, before, each, after, cleanup }: CommandHooks<A, O>) {
    Object.assign(this, { [COMMAND]: true });
    this.#init = init;
    this.#before = before;
    this.#each = each;
    this.#after = after;
    this.#cleanup = cleanup;
  }

  readonly init = (options: InitContextOptions): Commander<any, any> => {
    if (!this.#init) return options.commander;

    const context = new InitContext(options);

    try {
      return this.#init(context) as Commander<any, any>;
    } catch (error) {
      context.log.error(error instanceof Error ? error.message : `${error}`);
      process.exitCode = process.exitCode || 1;
    } finally {
      context.destroy();
    }

    return options.commander;
  };

  readonly before = async (options: BeforeOptions<A, O>): Promise<void> => {
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

    await this.#before(context)
      .catch((error) => {
        context.log.error(error instanceof Error ? error.message : `${error}`);
        process.exitCode = process.exitCode || 1;
      })
      .finally(() => context.destroy());
  };

  readonly each = async (options: EachOptions<A, O>): Promise<void> => {
    if (!this.#each) return;

    const context = new EachContext({
      ...options,
      isWorker: !isMainThread,
      workerData: undefined,
      saveAndRestoreFile: this.#saveAndRestoreFile,
      startWorker: (data) => this.#startWorker(options.command.main, { workerData: { stage: 'each', options, data } }),
    });

    await this.#each(context)
      .catch((error) => {
        context.log.error(error instanceof Error ? error.message : `${error}`);
        process.exitCode = process.exitCode || 1;
      })
      .then(() => this.#restoreBackupFiles(context.log))
      .finally(() => context.destroy());
  };

  readonly after = async (options: AfterOptions<A, O>): Promise<void> => {
    if (!this.#after) return;

    const context = new AfterContext({
      ...options,
      isWorker: !isMainThread,
      workerData: undefined,
      saveAndRestoreFile: this.#saveAndRestoreFile,
      startWorker: (data) => this.#startWorker(options.command.main, { workerData: { stage: 'after', options, data } }),
    });

    await this.#after(context)
      .catch((error) => {
        context.log.error(error instanceof Error ? error.message : `${error}`);
        process.exitCode = process.exitCode || 1;
      })
      .finally(() => context.destroy());
  };

  readonly cleanup = (options: CleanupContextOptions<A, O>): void => {
    if (!this.#cleanup) return;

    const context = new CleanupContext(options);

    try {
      this.#cleanup(context);
    } catch (error) {
      context.log.error(error instanceof Error ? error.message : `${error}`);
      process.exitCode = process.exitCode || 1;
    } finally {
      context.destroy();
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

    this.#fileBackups.push({ filename, content });
  };

  #restoreBackupFiles = async (log: Log): Promise<void> => {
    for (const fileBackup of this.#fileBackups) {
      try {
        if (fileBackup.content == null) {
          await unlink(fileBackup.filename).catch((error) => {
            if (error?.code !== 'ENOENT') throw error;
          });
        } else {
          await writeFile(fileBackup.filename, fileBackup.content);
        }
      } catch (error) {
        log.error(error);
        log.warn(`Failed to restore "${fileBackup.filename}".`);
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

export const isCommand = (value: unknown): value is Command<any, any> => {
  return (value as any)?.[COMMAND] === true;
};
