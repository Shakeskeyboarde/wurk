import { type CommanderArgs, type CommanderOptions } from '../commander/commander.js';
import { spawn, type SpawnOptions, type SpawnPromise } from '../utils/spawn.js';
import { type WorkspacePartialOptions } from '../workspace/get-workspaces.js';
import { Workspace } from '../workspace/workspace.js';
import { BaseContext, type BaseContextOptions } from './base-context.js';

export interface BaseAsyncContextOptions<A extends CommanderArgs, O extends CommanderOptions>
  extends BaseContextOptions {
  readonly commandMain: string;
  readonly args: A;
  readonly opts: O;
  readonly root: WorkspacePartialOptions;
  readonly workspaces: readonly WorkspacePartialOptions[];
  readonly gitHead: string | undefined;
  readonly gitFromRevision: string | undefined;
  readonly isWorker: boolean;
  readonly workerData: unknown;
  readonly saveAndRestoreFile: (filename: string) => Promise<void>;
  readonly startWorker: (data?: any) => Promise<boolean>;
}

export abstract class BaseAsyncContext<A extends CommanderArgs, O extends CommanderOptions> extends BaseContext {
  #startWorker: (data?: any) => Promise<boolean>;

  /**
   * The command entrypoint filename.
   */
  readonly commandMain: string;

  /**
   * Arguments parsed from the command line.
   */
  readonly args: A;

  /**
   * Options parsed from the command line.
   */
  readonly opts: O;

  /**
   * The workspaces root workspace.
   */
  readonly root: Workspace;

  /**
   * Map of all NPM workspaces in order of interdependency (dependencies
   * before dependents).
   */
  readonly workspaces: ReadonlyMap<string, Workspace>;

  /**
   * True if the command is running in a worker thread.
   */
  readonly isWorker: boolean;

  /**
   * Value passed to the `worker(filename, data)` method.
   */
  readonly workerData: any;

  /**
   * Absolute path of the workspaces root.
   */
  get rootDir(): string {
    return this.root.dir;
  }

  constructor({
    log,
    commandMain,
    args,
    opts,
    root,
    workspaces,
    gitHead,
    gitFromRevision,
    isWorker,
    workerData,
    packageManager,
    saveAndRestoreFile,
    startWorker,
  }: BaseAsyncContextOptions<A, O>) {
    super({ log, packageManager });

    this.commandMain = commandMain;
    this.args = args;
    this.opts = opts;
    this.workspaces = new Map(
      workspaces.map((workspace) => [
        workspace.name,
        new Workspace({
          ...workspace,
          log: this.log,
          workspaces: this.workspaces,
          gitHead,
          gitFromRevision,
          saveAndRestoreFile,
          spawn: this.spawn,
        }),
      ]),
    );
    this.root = new Workspace({
      ...root,
      log: this.log,
      workspaces: this.workspaces,
      gitHead,
      gitFromRevision,
      saveAndRestoreFile,
      spawn: this.spawn,
    });
    this.isWorker = isWorker;
    this.workerData = workerData;
    this.#startWorker = startWorker;

    this.spawn = this.spawn.bind(this);
    this.startWorker = this.startWorker.bind(this);
  }

  /**
   * Spawn a child process at the workspaces root.
   */
  spawn(
    cmd: string,
    args?: readonly (string | number | false | null | undefined)[],
    options?: SpawnOptions,
  ): SpawnPromise {
    return spawn(cmd, args, { cwd: this.root.dir, log: this.log, ...options });
  }

  /**
   * Returns false if already running in a worker thread. Creating nested
   * worker threads is not supported.
   */
  async startWorker(data?: any): Promise<boolean> {
    return await this.#startWorker(data);
  }
}
