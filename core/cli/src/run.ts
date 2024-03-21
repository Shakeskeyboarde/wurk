import { type UnknownCli } from './cli.js';
import { CliUsageError } from './error.js';
import { type UnknownResult } from './result.js';

type CleanupAction = (result: UnknownResult) => void | Promise<void>;

/**
 * Run the actions and command actions (recursively).
 */
export const run = async (cli: UnknownCli, result: UnknownResult): Promise<void> => {
  const cleanupActions: CleanupAction[] = [];

  try {
    for (const action of cli.actions) {
      const cleanupAction = await action(result);

      if (cleanupAction) {
        cleanupActions.unshift(cleanupAction);
      }
    }

    // There should only be one entry in the commands dictionary, but handle
    // all of them just in case.
    for (const [commandName, commandResult] of Object.entries(result.commandResult)) {
      if (!commandResult) continue;

      const command = cli.commands.find((value) => value.name === commandName)!;

      await run(command, commandResult);
    }

    for (const callback of cleanupActions) {
      await callback(result);
    }
  }
  catch (error) {
    if (error instanceof CliUsageError && !error.context) {
      error.context = cli;
    }

    throw error;
  }
};
