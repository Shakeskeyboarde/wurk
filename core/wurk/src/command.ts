import { Cli, type CliName, type EmptyResult } from '@wurk/cli';
import { type ImportResult } from '@wurk/import';
import { isLogLevel, LogLevel } from '@wurk/log';
import {
  AbortError,
  StatusValue,
  type WorkspaceCollection,
} from '@wurk/workspace';

import { CommandContext } from './context.js';

/**
 * Action callback for a Wurk command plugin.
 */
export interface CommandAction<TResult extends EmptyResult = EmptyResult> {
  (context: CommandContext<TResult>): Promise<void>;
}

/**
 * Configuration for a Wurk command plugin.
 */
export interface CommandHooks<
  TResult extends EmptyResult,
  TName extends string,
> {
  /**
   * Configure command line options.
   */
  readonly config?: (
    cli: Cli<EmptyResult, TName>,
    commandPackage: ImportResult['moduleConfig'],
  ) => Cli<TResult, TName>;

  /**
   * Command implementation.
   */
  readonly action: CommandAction<TResult>;
}

export interface Command<
  TResult extends EmptyResult = EmptyResult,
  TName extends string = string,
> {
  readonly cli: Cli<TResult, TName>;
  readonly init: (workspaces: WorkspaceCollection) => void;
}

export type CommandFactory<
  TResult extends EmptyResult = EmptyResult,
  TName extends string = string,
> = (commandPackage: ImportResult['moduleConfig']) => Command<TResult, TName>;

/**
 * Create a Wurk command plugin.
 *
 * @example
 * ```ts
 * export default createCommand('my-command', {
 *   config: (cli) => {
 *     // Configure command line options (optional).
 *     return cli.option('-f, --foo <value>', 'Foo option');
 *   },
 *   action: async (context) => {
 *     // Iterate over workspaces, spawn processes, modify files, etc.
 *     context.workspaces.forEach(async (workspace) => {
 *       // Do something with each selected workspace.
 *     });
 *   },
 * });
 * ```
 *
 * @returns A Wurk command plugin. The type is `unknown` because its not
 * intended for direct use, and exporting the type would complicate typescript
 * type declaration output.
 */
export const createCommand = <
  TName extends string,
  TResult extends EmptyResult,
>(
  name: CliName<TName>,
  hooks: CommandHooks<TResult, TName> | CommandAction,
): unknown => {
  const factory: CommandFactory<TResult, TName> = (commandPackage) => {
    let workspaces: WorkspaceCollection | undefined;

    const {
      config: configHook = (value: unknown) => value as Cli<TResult, TName>,
      action: actionHook,
    } =
      typeof hooks === 'function'
        ? { action: hooks as CommandAction<TResult> }
        : hooks;

    const cli = configHook(
      Cli.create(name)
        .description(commandPackage.at('description').as('string'))
        .version(commandPackage.at('version').as('string'))
        .optionHelp()
        .optionVersion(),
      commandPackage,
    ).action(async (result) => {
      if (!workspaces) throw new Error('command not initialized');

      let isAutoPrintStatusEnabled = false;

      const context = new CommandContext({
        result,
        workspaces,
        autoPrintStatus: (enabled = true) => {
          isAutoPrintStatusEnabled = enabled;
        },
      });
      const initialSelection = Array.from(workspaces);

      try {
        await actionHook(context);
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

          if (workspace.status.value >= StatusValue.failure) {
            process.exitCode ||= 1;
          }
        });

        if (isAutoPrintStatusEnabled) {
          workspaces.printStatus({
            prefix: result.name,
            condition: isLogLevel(LogLevel.verbose)
              ? undefined
              : (workspace) => {
                  return (
                    workspace.status.value !== StatusValue.skipped ||
                    initialSelection.includes(workspace)
                  );
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
