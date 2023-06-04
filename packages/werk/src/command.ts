import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMainThread, workerData } from 'node:worker_threads';

import { type Command as Commander } from '@commander-js/extra-typings';

import {
  InitContext,
  type InitContextOptions,
  RootContext,
  type RootContextOptions,
  WorkspaceContext,
  type WorkspaceContextOptions,
} from './context.js';
import { log } from './log.js';
import { readJsonFile } from './utils/json.js';
import { startWorker } from './utils/worker.js';

export type CommandInit<A extends any[], O extends {}> = (context: InitContext) => Commander<A, O>;

type WorkerData<A extends any[], O extends {}> =
  | {
      readonly stage: 'before' | 'after';
      readonly options: Omit<RootContextOptions<A, O>, 'startWorker' | 'workerData' | 'isWorker'>;
      readonly data: any;
    }
  | {
      readonly stage: 'each';
      readonly options: Omit<WorkspaceContextOptions<A, O>, 'startWorker' | 'workerData' | 'isWorker'>;
      readonly data: any;
    };

export interface CommandOptions<A extends any[], O extends {}, AA extends A = A, OO extends O = O> {
  init?: CommandInit<A, O>;
  before?: (context: RootContext<AA, OO>) => Promise<void>;
  each?: (context: WorkspaceContext<AA, OO>) => Promise<void>;
  after?: (context: RootContext<AA, OO>) => Promise<void>;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const COMMAND = Symbol('WerkCommand');

class Command<A extends any[], O extends {}> {
  #init: CommandInit<A, O> | undefined;
  #before: ((context: RootContext<A, O>) => Promise<void>) | undefined;
  #each: ((context: WorkspaceContext<A, O>) => Promise<void>) | undefined;
  #after: ((context: RootContext<A, O>) => Promise<void>) | undefined;

  constructor(optionsOrInit: CommandInit<A, O> | CommandOptions<A, O>) {
    Object.assign(this, { [COMMAND]: true });
    const {
      init,
      before = undefined,
      each = undefined,
      after = undefined,
    } = typeof optionsOrInit === 'function' ? { init: optionsOrInit } : optionsOrInit;
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
      // startWorker: (data) => this.#workerContext.start({ stage: 'each', options, data }),
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

  resume(): void {
    if (isMainThread) return;
    Promise.resolve()
      .then(async () => {
        const data: WorkerData<A, O> = await workerData;
        switch (data.stage) {
          case 'before':
          case 'after':
            await this[data.stage]({ isWorker: true, workerData: data.data, ...data.options });
            break;
          case 'each':
            await this.each({ isWorker: true, workerData: data.data, ...data.options });
            break;
        }
      })
      .catch((error) => log.error(error instanceof Error ? error.message : `${error}`));
  }
}

const isCommandExports = (value: unknown): value is { default: Command<any, any> } => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'default' in value &&
    typeof value.default === 'object' &&
    value.default !== null &&
    COMMAND in value.default
  );
};

export const createCommand = <A extends any[], O extends {}>(
  initOrOptions: CommandInit<A, O> | CommandOptions<A, O>,
): unknown => {
  const command = new Command(initOrOptions);
  command.resume();
  return command;
};

export const loadCommand = async (
  name: string,
  workspacesRoot: string,
  globalNodeModules: string,
): Promise<{ command: Command<any, any>; commandFilename: string }> => {
  const moduleIds = await readJsonFile(`${workspacesRoot}/package.json`).then((json: any) => {
    const value = json?.werk?.commands?.[name];
    return typeof value === 'string' ? [value] : [`@werk/command-${name}`, `werk-command-${name}`];
  });
  const paths = [join(workspacesRoot, 'node_modules'), globalNodeModules, __dirname];
  const [exports, commandFilename] = await moduleIds
    .reduce<Promise<[exports: unknown, id: string]>>(
      (promise, id) =>
        promise.catch(async () => {
          const filename = require.resolve(id, { paths });
          return [await import(filename), filename];
        }),
      Promise.reject(),
    )
    .catch(() => Promise.reject(new Error(`Command "${name}" not found. Do you need to install the command package?`)));

  if (!isCommandExports(exports)) throw new Error(`Command "${name}" does not have a valid command default export.`);

  return { command: exports.default, commandFilename };
};

export type { Command };
