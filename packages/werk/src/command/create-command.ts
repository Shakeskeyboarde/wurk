import { isMainThread, workerData } from 'node:worker_threads';

import { type CommanderArgs, type CommanderOptions } from '../commander/commander.js';
import { type RootContextOptions } from '../context/root-context.js';
import { type WorkspaceContextOptions } from '../context/workspace-context.js';
import { log } from '../log.js';
import { Command, type CommandHooks } from './command.js';

type CommandWorkerData<A extends CommanderArgs, O extends CommanderOptions> =
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
