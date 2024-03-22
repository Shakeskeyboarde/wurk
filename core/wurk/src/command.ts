import { Cli, type EmptyCliResult } from '@wurk/cli';
import { type JsonAccessor } from '@wurk/json';
import { type Workspace, type Workspaces } from '@wurk/workspace';

import { CommandContext } from './context.js';

/**
 * Configuration callback for a Wurk command plugin.
 */
export type CommandConfigCallback<
  TResult extends EmptyCliResult,
  TName extends string,
> = (cli: Cli<EmptyCliResult, TName>, config: JsonAccessor) => Cli<TResult, TName>;

/**
 * Action callback for a Wurk command plugin.
 */
export type CommandActionCallback<TResult extends EmptyCliResult = EmptyCliResult> = (
  context: CommandContext<TResult>,
) => Promise<void>;

/**
 * Configuration for a Wurk command plugin.
 */
export interface CommandHooks<
  TResult extends EmptyCliResult,
  TName extends string,
> {
  /**
   * Configure command line options.
   */
  readonly config?: CommandConfigCallback<TResult, TName>;

  /**
   * Command implementation.
   */
  readonly action: CommandActionCallback<TResult>;
}

/**
 * Wurk command plugin.
 *
 * @internal
 */
export interface Command<
  TResult extends EmptyCliResult = EmptyCliResult,
  TName extends string = string,
> {
  /**
   * The {@link Cli} definition for the plugin.
   */
  readonly cli: Cli<TResult, TName>;
  /**
   * Initialization method for the plugin. This is called once before the
   * command is executed to pass workspace information to the plugin.
   */
  readonly init: (config: InitConfig) => void;
}

interface InitConfig {
  readonly root: Workspace;
  readonly workspaces: Workspaces;
}

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
  TResult extends EmptyCliResult,
>(
  name: TName,
  hooks: CommandHooks<TResult, TName> | CommandActionCallback,
): unknown => {
  return new CommandFactory((config, pm) => {
    let initConfig: InitConfig | undefined;

    const {
      config: configHook = (value: unknown) => value as Cli<TResult, TName>,
      action: actionHook,
    } = typeof hooks === 'function'
      ? { action: hooks as CommandActionCallback<TResult> }
      : hooks;

    const cli = configHook(
      Cli.create(name)
        .description(config
          .at('description')
          .as('string'))
        .version(config
          .at('version')
          .as('string'))
        .optionHelp()
        .optionVersion(),
      config,
    )
      .action(async (result) => {
        if (!initConfig) throw new Error('command not initialized');

        const { root, workspaces } = initConfig;
        const context = new CommandContext({ result, root, workspaces, pm });

        await actionHook(context);
      });

    const init = (newInitConfig: InitConfig): void => {
      initConfig = newInitConfig;
    };

    return { cli, init };
  });
};

/**
 * Factory which loads a Wurk command. This is what is actually returned
 * from the {@link createCommand} function, even though the function returns
 * `unknown`.
 *
 * @internal
 */
export class CommandFactory<
  TResult extends EmptyCliResult = EmptyCliResult,
  TName extends string = string,
> {
  /**
   * Get the {@link Command} instance for the plugin. This is passed the
   * command's own configuration (ie. `package.json` data), and the package
   * manager command name (ie. `npm`, `yarn`, `pnpm`).
   */
  readonly load: (config: JsonAccessor, pm: string) => Command<TResult, TName>;

  /**
   * Create a new command factory.
   */
  constructor(load: (config: JsonAccessor, pm: string) => Command<TResult, TName>) {
    this.load = load;
  }
}
