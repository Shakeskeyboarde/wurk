import {
  type InferResultCommand,
  type InferResultOptions,
  type Result,
  type UnknownResult,
} from '@wurk/cli';
import { Log } from '@wurk/log';
import { type WorkspaceCollection } from '@wurk/workspace';

export interface ContextOptions<TResult extends UnknownResult> {
  readonly result: TResult;
  readonly workspaces: WorkspaceCollection;
  readonly autoPrintStatus: (enabled?: boolean) => void;
}

export class Context<TResult extends UnknownResult>
  implements Result<InferResultOptions<TResult>, InferResultCommand<TResult>>
{
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
   * When enabled, a status summary for all workspaces will be printed after
   * the command completes, even if an error is thrown.
   */
  readonly autoPrintStatus: (enabled?: boolean) => void;

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
    const { result, workspaces, autoPrintStatus } = options;

    this.#result = result;
    this.log = new Log();
    this.workspaces = workspaces;
    this.autoPrintStatus = autoPrintStatus;
  }

  getHelpText = (error?: unknown): string => {
    return this.#result.getHelpText(error);
  };

  printHelp = (error?: unknown): void => {
    return this.#result.printHelp(error);
  };
}
