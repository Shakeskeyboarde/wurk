import { isMainThread } from 'node:worker_threads';

import { type Commander, type CommanderArgs, type CommanderOptions } from '../commander/commander.js';
import { InitContext, type InitContextOptions } from '../context/init-context.js';
import { RootContext, type RootContextOptions } from '../context/root-context.js';
import { WorkspaceContext, type WorkspaceContextOptions } from '../context/workspace-context.js';
import { startWorker } from '../utils/start-worker.js';

export interface CommandHooks<A extends CommanderArgs, O extends CommanderOptions, AA extends A = A, OO extends O = O> {
  readonly init?: (context: InitContext) => Commander<A, O>;
  readonly before?: (context: RootContext<AA, OO>) => Promise<void>;
  readonly each?: (context: WorkspaceContext<AA, OO>) => Promise<void>;
  readonly after?: (context: RootContext<AA, OO>) => Promise<void>;
}

export interface CommandType<A extends CommanderArgs, O extends CommanderOptions> {
  readonly init: (options: InitContextOptions) => Commander<any, any>;
  readonly before: (options: Omit<RootContextOptions<A, O>, 'startWorker'>) => Promise<void>;
  readonly each: (options: Omit<WorkspaceContextOptions<A, O>, 'startWorker'>) => Promise<void>;
  readonly after: (options: Omit<RootContextOptions<A, O>, 'startWorker'>) => Promise<void>;
}

const COMMAND = Symbol('WerkCommand');

export class Command<A extends CommanderArgs, O extends CommanderOptions> implements CommandType<A, O> {
  #init: ((context: InitContext) => Commander<A, O>) | undefined;
  #before: ((context: RootContext<A, O>) => Promise<void>) | undefined;
  #each: ((context: WorkspaceContext<A, O>) => Promise<void>) | undefined;
  #after: ((context: RootContext<A, O>) => Promise<void>) | undefined;

  constructor({ init, before, each, after }: CommandHooks<A, O>) {
    Object.assign(this, { [COMMAND]: true });
    this.#init = init;
    this.#before = before;
    this.#each = each;
    this.#after = after;
  }

  readonly init = (options: InitContextOptions): Commander<any, any> => {
    if (!this.#init) return options.commander;

    const context = new InitContext(options);

    return this.#init(context);
  };

  readonly before = async (options: Omit<RootContextOptions<A, O>, 'startWorker'>): Promise<void> => {
    if (!this.#before) return;

    const context = new RootContext({
      ...options,
      isWorker: !isMainThread,
      workerData: undefined,
      startWorker: (data) =>
        startWorker(options.main, {
          workerData: { stage: 'before', options, data },
          allowStdin: !options.log?.prefix,
        }),
    });

    await this.#before(context);
  };

  readonly each = async (options: Omit<WorkspaceContextOptions<A, O>, 'startWorker'>): Promise<void> => {
    if (!this.#each) return;

    const context = new WorkspaceContext({
      ...options,
      isWorker: !isMainThread,
      workerData: undefined,
      startWorker: (data) =>
        startWorker(options.main, {
          workerData: { stage: 'each', options, data },
          allowStdin: !options.log?.prefix,
        }),
    });

    await this.#each(context);
  };

  readonly after = async (options: Omit<RootContextOptions<A, O>, 'startWorker'>): Promise<void> => {
    if (!this.#after) return;

    const context = new RootContext({
      ...options,
      isWorker: !isMainThread,
      workerData: undefined,
      startWorker: (data) =>
        startWorker(options.main, {
          workerData: { stage: 'after', options, data },
          allowStdin: !options.log?.prefix,
        }),
    });

    await this.#after(context);
  };
}

export const isCommand = (value: unknown): value is Command<any, any> => {
  return (value as any)?.[COMMAND] === true;
};
