import { isMainThread } from 'node:worker_threads';

import { type Commander, type CommanderArgs, type CommanderOptions } from '../commander/commander.js';
import { CleanupContext, type CleanupContextOptions } from '../context/cleanup-context.js';
import { InitContext, type InitContextOptions } from '../context/init-context.js';
import { RootContext, type RootContextOptions } from '../context/root-context.js';
import { WorkspaceContext, type WorkspaceContextOptions } from '../context/workspace-context.js';
import { startWorker } from '../utils/start-worker.js';

export interface CommandHooks<A extends CommanderArgs, O extends CommanderOptions, AA extends A = A, OO extends O = O> {
  /**
   * Called when the command is loaded. Intended for configuration of
   * command options, arguments, and help text.
   */
  readonly init?: (context: InitContext) => Commander<A, O>;
  /**
   * Run once before handling individual workspaces.
   */
  readonly before?: (context: RootContext<AA, OO>) => Promise<void>;
  /**
   * Run once for each workspace.
   */
  readonly each?: (context: WorkspaceContext<AA, OO>) => Promise<void>;
  /**
   * Run once after handling individual workspaces.
   */
  readonly after?: (context: RootContext<AA, OO>) => Promise<void>;
  /**
   * Run once after all other hooks. This is the last chance to perform
   * cleanup, and it must be synchronous.
   */
  readonly cleanup?: (context: CleanupContext<AA, OO>) => void | undefined;
}

export interface CommandType<A extends CommanderArgs, O extends CommanderOptions> {
  readonly init: (options: InitContextOptions) => void;
  readonly before: (options: Omit<RootContextOptions<A, O>, 'startWorker'>) => Promise<void>;
  readonly each: (options: Omit<WorkspaceContextOptions<A, O>, 'startWorker'>) => Promise<void>;
  readonly after: (options: Omit<RootContextOptions<A, O>, 'startWorker'>) => Promise<void>;
  readonly cleanup: (context: CleanupContextOptions<A, O>) => void;
}

const COMMAND = Symbol('WerkCommand');

export class Command<A extends CommanderArgs, O extends CommanderOptions> implements CommandType<A, O> {
  readonly #init: ((context: InitContext) => Commander<A, O>) | undefined;
  readonly #before: ((context: RootContext<A, O>) => Promise<void>) | undefined;
  readonly #each: ((context: WorkspaceContext<A, O>) => Promise<void>) | undefined;
  readonly #after: ((context: RootContext<A, O>) => Promise<void>) | undefined;
  readonly #cleanup: ((context: CleanupContext<A, O>) => void) | undefined;

  constructor({ init, before, each, after, cleanup }: CommandHooks<A, O>) {
    Object.assign(this, { [COMMAND]: true });
    this.#init = init;
    this.#before = before;
    this.#each = each;
    this.#after = after;
    this.#cleanup = cleanup;
  }

  readonly init = (options: InitContextOptions): void => {
    if (!this.#init) return;

    const context = new InitContext(options);

    try {
      this.#init(context);
    } catch (error) {
      context.log.error(error instanceof Error ? error.message : `${error}`);
      process.exitCode = process.exitCode || 1;
    }
  };

  readonly before = async (options: Omit<RootContextOptions<A, O>, 'startWorker'>): Promise<void> => {
    if (!this.#before) return;

    const context = new RootContext({
      ...options,
      isWorker: !isMainThread,
      workerData: undefined,
      startWorker: (data) => startWorker(options.command.main, { workerData: { stage: 'before', options, data } }),
    });

    await this.#before(context).catch((error) => {
      context.log.error(error instanceof Error ? error.message : `${error}`);
      process.exitCode = process.exitCode || 1;
    });
  };

  readonly each = async (options: Omit<WorkspaceContextOptions<A, O>, 'startWorker'>): Promise<void> => {
    if (!this.#each) return;

    const context = new WorkspaceContext({
      ...options,
      isWorker: !isMainThread,
      workerData: undefined,
      startWorker: (data) => startWorker(options.command.main, { workerData: { stage: 'each', options, data } }),
    });

    await this.#each(context).catch((error) => {
      context.log.error(error instanceof Error ? error.message : `${error}`);
      process.exitCode = process.exitCode || 1;
    });
  };

  readonly after = async (options: Omit<RootContextOptions<A, O>, 'startWorker'>): Promise<void> => {
    if (!this.#after) return;

    const context = new RootContext({
      ...options,
      isWorker: !isMainThread,
      workerData: undefined,
      startWorker: (data) => startWorker(options.command.main, { workerData: { stage: 'after', options, data } }),
    });

    await this.#after(context).catch((error) => {
      context.log.error(error instanceof Error ? error.message : `${error}`);
      process.exitCode = process.exitCode || 1;
    });
  };

  readonly cleanup = (options: CleanupContextOptions<A, O>): void => {
    if (!this.#cleanup) return;

    const context = new CleanupContext(options);

    try {
      this.#cleanup(context);
    } catch (error) {
      context.log.error(error instanceof Error ? error.message : `${error}`);
      process.exitCode = process.exitCode || 1;
    }
  };
}

export const isCommand = (value: unknown): value is Command<any, any> => {
  return (value as any)?.[COMMAND] === true;
};
