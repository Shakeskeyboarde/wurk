import { isMainThread, workerData } from 'node:worker_threads';

import { type CommanderArgs, type CommanderOptions } from '../commander/commander.js';
import { log } from '../utils/log.js';
import { type AfterOptions, type BeforeOptions, Command, type CommandHooks, type EachOptions } from './command.js';

type WorkerOptions = 'workerData' | 'isWorker';

type CommandWorkerData<A extends CommanderArgs, O extends CommanderOptions> =
  | {
      readonly stage: 'before';
      readonly options: Omit<BeforeOptions<A, O>, WorkerOptions>;
      readonly data: any;
    }
  | {
      readonly stage: 'each';
      readonly options: Omit<EachOptions<A, O>, WorkerOptions>;
      readonly data: any;
    }
  | {
      readonly stage: 'after';
      readonly options: Omit<AfterOptions<A, O>, WorkerOptions>;
      readonly data: any;
    };

/**
 * Define a Werk custom command.
 *
 * The result of this function should be the default export of the command package.
 */
export const createCommand = <A extends CommanderArgs, O extends CommanderOptions>(
  hooks: CommandHooks<A, O>,
): unknown => {
  const command = new Command(hooks);

  if (!isMainThread) {
    Promise.resolve()
      .then(async () => {
        const { stage, data, options }: CommandWorkerData<A, O> = workerData;

        switch (stage) {
          case 'before':
            await command.before({ isWorker: true, workerData: data, ...options });
            break;
          case 'each':
            await command.each({ isWorker: true, workerData: data, ...options });
            break;
          case 'after':
            await command.after({ isWorker: true, workerData: data, ...options });
            break;
        }
      })
      .catch((error) => log.error(error instanceof Error ? error.message : `${error}`));

    return;
  }

  return command;
};
