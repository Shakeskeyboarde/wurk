import {
  type AnyCustomCommander,
  type CommanderArgs,
  type CommanderOptions,
  type CustomCommander,
} from '../commander/commander.js';
import { type AfterContext, type AfterContextOptions } from '../context/after-context.js';
import { type BeforeContext, type BeforeContextOptions } from '../context/before-context.js';
import { type CleanupContext } from '../context/cleanup-context.js';
import { type EachContext, type EachContextOptions } from '../context/each-context.js';
import { log } from '../utils/log.js';

type FunctionKeys<T> = { [K in keyof T]-?: T[K] extends Function ? K : never }[keyof T];

export type BeforeOptions<A extends CommanderArgs, O extends CommanderOptions> = Omit<
  BeforeContextOptions<A, O>,
  FunctionKeys<BeforeContextOptions<CommanderArgs, CommanderOptions>>
>;
export type EachOptions<A extends CommanderArgs, O extends CommanderOptions, M> = Omit<
  EachContextOptions<A, O, M>,
  FunctionKeys<EachContextOptions<CommanderArgs, CommanderOptions, unknown>>
>;
export type AfterOptions<A extends CommanderArgs, O extends CommanderOptions> = Omit<
  AfterContextOptions<A, O>,
  FunctionKeys<AfterContextOptions<CommanderArgs, CommanderOptions>>
>;

export interface CommandHooks<A extends CommanderArgs, O extends CommanderOptions, M> {
  /**
   * Called when the command is loaded. Intended for configuration of
   * command options, arguments, and help text.
   */
  readonly config?: (commander: CustomCommander) => CustomCommander<A, O>;

  /**
   * Run once before handling individual workspaces. This hook can also
   * return an array of values which will be used as a "matrix" when
   * running the `each` hook. The `each` hook will run once for every
   * workspace and matrix value combination.
   */
  readonly before?: (context: BeforeContext<A, O>) => Promise<void | undefined | M[]>;

  /**
   * Run once for each workspace.
   */
  readonly each?: (context: EachContext<A, O, M>) => Promise<void>;

  /**
   * Run once after handling individual workspaces.
   */
  readonly after?: (context: AfterContext<A, O>) => Promise<void>;

  /**
   * Run once after all other hooks. This is the last chance to perform
   * cleanup, and it must be synchronous.
   */
  readonly cleanup?: (context: CleanupContext<A, O>) => void | undefined;
}

const COMMAND = Symbol('WerkCommand');

export class Command<A extends CommanderArgs, O extends CommanderOptions, M> {
  readonly #config: ((commander: CustomCommander) => CustomCommander<A, O>) | undefined;
  readonly #before: ((context: BeforeContext<A, O>) => Promise<void | undefined | M[]>) | undefined;
  readonly #each: ((context: EachContext<A, O, M>) => Promise<void>) | undefined;
  readonly #after: ((context: AfterContext<A, O>) => Promise<void>) | undefined;
  readonly #cleanup: ((context: CleanupContext<A, O>) => void) | undefined;
  // readonly #fileBackups: { filename: string; content: Buffer | null }[] = [];

  constructor({ config, before, each, after, cleanup }: CommandHooks<A, O, M>) {
    Object.assign(this, { [COMMAND]: true });
    this.#config = config;
    this.#before = before;
    this.#each = each;
    this.#after = after;
    this.#cleanup = cleanup;
  }

  readonly config = (commander: CustomCommander): AnyCustomCommander => {
    if (!this.#config) return commander;

    return this.#config(commander);
  };

  readonly before = async (context: BeforeContext<A, O>): Promise<void | undefined | M[]> => {
    log.silly('before()');

    if (!this.#before) return;

    return await this.#before(context).catch((error) => {
      context.log.error(error);
      process.exitCode = process.exitCode || 1;
    });
  };

  readonly each = async (context: EachContext<A, O, M>): Promise<void> => {
    log.silly(`each('${context.workspace.name}')`);

    if (!this.#each) return;

    await this.#each(context).catch((error) => {
      context.log.error(error);
      process.exitCode = process.exitCode || 1;
    });
  };

  readonly after = async (context: AfterContext<A, O>): Promise<void> => {
    log.silly('after()');

    if (!this.#after) return;

    await this.#after(context).catch((error) => {
      context.log.error(error);
      process.exitCode = process.exitCode || 1;
    });
  };

  readonly cleanup = (context: CleanupContext<A, O>): void => {
    log.silly('cleanup()');

    if (!this.#cleanup) return;

    try {
      this.#cleanup(context);
    } catch (error) {
      context.log.error(error);
      process.exitCode = process.exitCode || 1;
    }
  };
}

export const isCommand = (value: unknown): value is Command<any, any, any> => {
  return (value as any)?.[COMMAND] === true;
};
