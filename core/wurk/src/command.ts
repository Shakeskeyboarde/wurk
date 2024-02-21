import { Cli, type CliName, type EmptyResult } from '@wurk/cli';
import { type ImportResult } from '@wurk/import';
import { isLogLevel, LogLevel } from '@wurk/log';
import { AbortError, StatusValue, type WorkspaceCollection } from '@wurk/workspace';

import { Context } from './context.js';

interface CommandHooks<TResult extends EmptyResult, TName extends string> {
  readonly config?: (cli: Cli<EmptyResult, TName>, commandPackage: ImportResult['moduleConfig']) => Cli<TResult, TName>;
  readonly run: (context: Context<TResult>) => Promise<void>;
}

export interface Command<TResult extends EmptyResult = EmptyResult, TName extends string = string> {
  readonly cli: Cli<TResult, TName>;
  readonly init: (workspaces: WorkspaceCollection) => void;
}

export type CommandFactory<TResult extends EmptyResult = EmptyResult, TName extends string = string> = (
  commandPackage: ImportResult['moduleConfig'],
) => Command<TResult, TName>;

export const createCommand = <TName extends string, TResult extends EmptyResult>(
  name: CliName<TName>,
  hooks: CommandHooks<TResult, TName>,
): unknown => {
  const factory: CommandFactory<TResult, TName> = (commandPackage) => {
    let workspaces: WorkspaceCollection | undefined;

    const cli = (hooks.config ?? ((value) => value as Cli<TResult, TName>))(
      Cli.create(name)
        .description(commandPackage.at('description').as('string'))
        .version(commandPackage.at('version').as('string'))
        .optionHelp()
        .optionVersion(),
      commandPackage,
    ).action(async (result) => {
      if (!workspaces) throw new Error('command not initialized');

      let isAutoPrintStatusEnabled = false;

      const context = new Context({
        result,
        workspaces,
        autoPrintStatus: (enabled = true) => void (isAutoPrintStatusEnabled = enabled),
      });
      const initialSelection = Array.from(workspaces);

      try {
        await hooks.run(context);
      } catch (error) {
        process.exitCode ||= 1;

        if (!(error instanceof AbortError)) {
          context.log.error(error);
        }
      } finally {
        workspaces.forEachSync((workspace) => {
          if (workspace.status.value === StatusValue.pending) {
            workspace.status.set(StatusValue.failure);
          }

          if (workspace.status.value >= StatusValue.warning) {
            process.exitCode ||= 1;
          }
        });

        if (isAutoPrintStatusEnabled) {
          workspaces.printStatus({
            prefix: result.name,
            condition: isLogLevel(LogLevel.verbose)
              ? undefined
              : (workspace) => {
                  return workspace.status.value !== StatusValue.skipped || initialSelection.includes(workspace);
                },
          });
        }
      }
    });

    const init = (newWorkspaces: WorkspaceCollection): void => {
      workspaces = newWorkspaces;
    };

    return { cli, init };
  };

  return factory;
};

export const isCommand = (value: unknown): value is Command => {
  return (
    value != null &&
    typeof value === 'object' &&
    'cli' in value &&
    value.cli instanceof Cli &&
    'init' in value &&
    typeof value.init === 'function'
  );
};
