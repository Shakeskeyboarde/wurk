import { isMainThread, parentPort, workerData } from 'node:worker_threads';

import { type CommanderArgs, type CommanderOptions } from '../commander/commander.js';
import { type AfterContextOptions } from '../context/after-context.js';
import { type BeforeContextOptions } from '../context/before-context.js';
import { type EachContextOptions } from '../context/each-context.js';
import { log } from '../utils/log.js';
import { Command, type CommandHooks } from './command.js';

type CommandWorkerData<A extends CommanderArgs, O extends CommanderOptions> =
  | {
      readonly stage: 'before';
      readonly options: Omit<BeforeContextOptions<A, O>, 'startWorker' | 'workerData' | 'isWorker' | 'forceWait'>;
      readonly data: any;
    }
  | {
      readonly stage: 'each';
      readonly options: Omit<EachContextOptions<A, O>, 'startWorker' | 'workerData' | 'isWorker'>;
      readonly data: any;
    }
  | {
      readonly stage: 'after';
      readonly options: Omit<AfterContextOptions<A, O>, 'startWorker' | 'workerData' | 'isWorker'>;
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
        const data: CommandWorkerData<A, O> = workerData;

        switch (data.stage) {
          case 'before':
            await command[data.stage]({
              isWorker: true,
              workerData: data.data,
              forceWait: () => parentPort?.postMessage({ type: 'forceWait' }),
              ...data.options,
            });
            break;
          case 'each':
            await command.each({ isWorker: true, workerData: data.data, ...data.options });
            break;
          case 'after':
            await command[data.stage]({ isWorker: true, workerData: data.data, ...data.options });
            break;
        }
      })
      .catch((error) => log.error(error instanceof Error ? error.message : `${error}`));

    return;
  }

  return command;
};
