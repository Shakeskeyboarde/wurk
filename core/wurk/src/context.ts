import {
  type InferResultCommand,
  type InferResultOptions,
  type Result,
  type UnknownResult,
} from '@wurk/cli';
import { Git } from '@wurk/git';
import { Log } from '@wurk/log';
import { type Spawn, spawn } from '@wurk/spawn';
import { type Workspace, type Workspaces } from '@wurk/workspace';

interface ContextOptions<TResult extends UnknownResult> {
  readonly result: TResult;
  readonly root: Workspace;
  readonly workspaces: Workspaces;
  readonly pm: string;
}

/**
 * Context passed to Wurk command action hook.
 */
export class CommandContext<TResult extends UnknownResult>
implements Result<InferResultOptions<TResult>, InferResultCommand<TResult>> {
  readonly #result: TResult;

  /**
   * Global logger for the command. This logger has no prefix unless one is
   * set by the command.
   */
  readonly log: Log;

  /**
   * The root workspace of the project.
   */
  readonly root: Workspace;

  /**
   * Collection of all workspaces in the project.
   */
  readonly workspaces: Workspaces;

  /**
   * The package manager in use. This should be one of: `npm`, `pnpm`, or
   * `yarn`. Additional package managers may be supported in the future.
   */
  readonly pm: string;

  /**
   * The name of the command.
   */
  get name(): string {
    return this.#result.name;
  }

  /**
   * Options derived from argument parsing and actions.
   */
  get options(): InferResultOptions<TResult> {
    return this.#result.options as InferResultOptions<TResult>;
  }

  /**
   * Results of (sub-)command argument parsing and actions.
   *
   * NOTE: This is a "dictionary" object which will have zero or one keys
   * defined, because only zero or one commands can be matched per parent
   * command.
   */
  get commandResult(): InferResultCommand<TResult> {
    return this.#result.commandResult as InferResultCommand<TResult>;
  }

  /**
   * Option keys which have been parsed from command line arguments.
   *
   * NOTE: Options can also be set programmatically, which will NOT add them
   * to this set. This set can be used to validate combinations of options
   * used on the command line (eg. conflicts) without being affected by other
   * programmatic updates and side effects.
   */
  get parsed(): ReadonlySet<string> {
    return this.#result.parsed;
  }

  /**
   * Create a new command context.
   */
  constructor(options: ContextOptions<TResult>) {
    const { result, root, workspaces, pm } = options;

    this.#result = result;
    this.log = new Log();
    this.root = root;
    this.workspaces = workspaces;
    this.pm = pm;
  }

  /**
   * Create a Git API instance for the workspace directory.
   *
   * Throws:
   * - If Git is not installed (ENOENT)
   * - If the directory is not a repo (ENOREPO)
   */
  readonly createGit = async (): Promise<Git> => {
    return await Git.create({ dir: this.root.dir, log: this.log });
  };

  /**
   * Get the help text of the command that produced this result.
   */
  readonly getHelpText = (error?: unknown): string => {
    return this.#result.getHelpText(error);
  };

  /**
   * Print the help text of the command that produced this result.
   */
  readonly printHelp = (error?: unknown): void => {
    return this.#result.printHelp(error);
  };

  /**
   * Spawn a child process relative to the root workspace directory.
   */
  readonly spawn: Spawn = (cmd, sparseArgs?, ...options) => spawn(cmd, sparseArgs, {
    log: this.log,
    cwd: this.root.dir,
  }, ...options);
}
