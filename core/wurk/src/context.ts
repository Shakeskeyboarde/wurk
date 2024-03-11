import {
  type InferResultCommand,
  type InferResultOptions,
  type Result,
  type UnknownResult,
} from '@wurk/cli';
import { Git } from '@wurk/git';
import { Log } from '@wurk/log';
import { type PackageManager } from '@wurk/pm';
import { type WorkspaceCollection } from '@wurk/workspace';

interface ContextOptions<TResult extends UnknownResult> {
  readonly result: TResult;
  readonly workspaces: WorkspaceCollection;
  readonly pm: PackageManager;
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
   * Collection of all workspaces in the project.
   */
  readonly workspaces: WorkspaceCollection;

  /**
   * Package manager utilities.
   */
  readonly pm: PackageManager;

  get name(): string {
    return this.#result.name;
  }

  get options(): InferResultOptions<TResult> {
    return this.#result.options as InferResultOptions<TResult>;
  }

  get command(): InferResultCommand<TResult> {
    return this.#result.command as InferResultCommand<TResult>;
  }

  get parsed(): ReadonlySet<string> {
    return this.#result.parsed;
  }

  constructor(options: ContextOptions<TResult>) {
    const { result, workspaces, pm } = options;

    this.#result = result;
    this.log = new Log();
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
    return await Git.create({ dir: this.workspaces.root.dir, log: this.log });
  };

  getHelpText = (error?: unknown): string => {
    return this.#result.getHelpText(error);
  };

  printHelp = (error?: unknown): void => {
    return this.#result.printHelp(error);
  };
}
