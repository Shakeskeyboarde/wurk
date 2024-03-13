import {
  type InferResultCommand,
  type InferResultOptions,
  type Result,
  type UnknownResult,
} from '@wurk/cli';
import { Git } from '@wurk/git';
import { Log } from '@wurk/log';
import { createSpawn } from '@wurk/spawn';
import { type Workspace, type Workspaces } from '@wurk/workspace';

interface ContextOptions<TResult extends UnknownResult> {
  readonly result: TResult;
  readonly root: Workspace;
  readonly workspaces: Workspaces;
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

  get name(): string {
    return this.#result.name;
  }

  get options(): InferResultOptions<TResult> {
    return this.#result.options as InferResultOptions<TResult>;
  }

  get commandResult(): InferResultCommand<TResult> {
    return this.#result.commandResult as InferResultCommand<TResult>;
  }

  get parsed(): ReadonlySet<string> {
    return this.#result.parsed;
  }

  constructor(options: ContextOptions<TResult>) {
    const { result, root, workspaces } = options;

    this.#result = result;
    this.log = new Log();
    this.root = root;
    this.workspaces = workspaces;
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

  readonly getHelpText = (error?: unknown): string => {
    return this.#result.getHelpText(error);
  };

  readonly printHelp = (error?: unknown): void => {
    return this.#result.printHelp(error);
  };

  readonly spawn = createSpawn(() => ({
    log: this.log,
    cwd: this.root.dir,
  }));
}
