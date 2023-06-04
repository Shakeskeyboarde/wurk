import { type Command as Commander } from '@commander-js/extra-typings';

import { Log, type LogOptions } from './log.js';
import { type Spawn, spawn } from './utils/process.js';
import { Workspace, type WorkspaceOptions } from './workspace.js';

export interface InitContextOptions {
  readonly main: string;
  readonly log?: LogOptions;
  readonly rootDir: string;
  readonly commander: Commander;
}

export interface RootContextOptions<A extends any[], O extends {}> {
  readonly main: string;
  readonly log?: LogOptions;
  readonly rootDir: string;
  readonly args: A;
  readonly opts: O;
  readonly workspaces: ReadonlyMap<string, WorkspaceOptions>;
  readonly isWorker: boolean;
  readonly workerData: any;
  readonly startWorker: (data?: any) => Promise<boolean>;
}

export interface WorkspaceContextOptions<A extends any[], O extends {}> extends RootContextOptions<A, O> {
  readonly workspace: WorkspaceOptions;
}

export class InitContext implements InitContextOptions {
  /**
   * Main entry point filename of the command package.
   */
  readonly main: string;

  /**
   * Logger.
   */
  readonly log: Log;

  /**
   * Absolute path of the workspaces root.
   */
  readonly rootDir: string;

  /**
   * Configurable Commander command instance.
   */
  readonly commander: Commander;

  constructor({ main, log, rootDir, commander }: InitContextOptions) {
    this.main = main;
    this.log = new Log(log);
    this.rootDir = rootDir;
    this.commander = commander;
  }
}

export class RootContext<A extends any[], O extends {}> {
  /**
   * Logger.
   */
  readonly log: Log;

  /**
   * Absolute path of the workspaces root.
   */
  readonly rootDir: string;

  /**
   * Arguments parsed from the command.
   */
  readonly args: A;

  /**
   * Options parsed from the command.
   */
  readonly opts: O;

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
   * Returns false if already running in a worker thread. Creating nested
   * worker threads is not supported.
   */
  readonly startWorker: (data?: any) => Promise<boolean>;

  /**
   * Copy constructor.
   */
  constructor(options: RootContextOptions<A, O>) {
    const { log, rootDir, args, opts, workspaces, isWorker, workerData, startWorker } = options;

    this.log = new Log(log);
    this.rootDir = rootDir;
    this.args = args;
    this.opts = opts;
    this.workspaces = new Map([...workspaces.entries()].map(([name, workspace]) => [name, new Workspace(workspace)]));
    this.isWorker = isWorker;
    this.workerData = workerData;
    this.startWorker = startWorker;
  }

  /**
   * Spawn a child process at the workspaces root.
   */
  readonly spawn: Spawn = (cmd, args, options) => {
    return spawn(cmd, args, { cwd: this.rootDir, log: this.log, ...options });
  };
}

export class WorkspaceContext<A extends any[], O extends {}> extends RootContext<A, O> {
  /**
   * The current workspace.
   */
  readonly workspace: Workspace;

  /**
   * Copy constructor.
   */
  constructor({ workspace, ...superOptions }: WorkspaceContextOptions<A, O>) {
    super(superOptions);

    this.workspace = new Workspace(workspace);
  }

  /**
   * Spawn a child process at the workspaces root.
   */
  readonly spawn: Spawn = (cmd, args, options) => {
    return spawn(cmd, args, { cwd: this.workspace.dir, log: this.log, ...options });
  };
}
