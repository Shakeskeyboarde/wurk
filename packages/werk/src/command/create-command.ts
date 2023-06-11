import { isMainThread, workerData } from 'node:worker_threads';

import { type CommanderArgs, type CommanderOptions } from '../commander/commander.js';
import { type ContextOptions } from '../context/context.js';
import { type EachContextOptions } from '../context/each-context.js';
import { log } from '../utils/log.js';
import { Command, type CommandHooks } from './command.js';

type CommandWorkerData<A extends CommanderArgs, O extends CommanderOptions> =
  | {
      readonly stage: 'before' | 'after';
      readonly options: Omit<ContextOptions<A, O>, 'startWorker' | 'workerData' | 'isWorker'>;
      readonly data: any;
    }
  | {
      readonly stage: 'each';
      readonly options: Omit<EachContextOptions<A, O>, 'startWorker' | 'workerData' | 'isWorker'>;
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
          case 'after':
            await command[data.stage]({ isWorker: true, workerData: data.data, ...data.options });
            break;
          case 'each':
            await command.each({ isWorker: true, workerData: data.data, ...data.options });
            break;
        }
      })
      .catch((error) => log.error(error instanceof Error ? error.message : `${error}`));

    return;
  }

  return command;
};
