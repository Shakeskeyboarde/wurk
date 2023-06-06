import { type CommanderArgs, type CommanderOptions } from '../commander/commander.js';
import { Log, type LogOptions } from '../log.js';
import { type Spawn, spawn } from '../utils/spawn.js';
import { Workspace, type WorkspaceOptions } from '../workspace/workspace.js';

export interface RootContextOptions<A extends CommanderArgs, O extends CommanderOptions> {
  readonly log?: LogOptions;
  readonly main: string;
  readonly rootDir: string;
  readonly args: A;
  readonly opts: O;
  readonly workspaces: readonly WorkspaceOptions[];
  readonly isWorker: boolean;
  readonly workerData: any;
  readonly startWorker: (data?: any) => Promise<boolean>;
}

export class RootContext<A extends CommanderArgs, O extends CommanderOptions> {
  /**
   * Logger.
   */
  readonly log: Log;

  /**
   * Main filename of the command package.
   */
  readonly main: string;

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
    const { log, main, rootDir, args, opts, workspaces, isWorker, workerData, startWorker } = options;

    this.log = new Log(log);
    this.main = main;
    this.rootDir = rootDir;
    this.args = args;
    this.opts = opts;
    this.workspaces = new Map([...workspaces].map((workspace) => [workspace.name, new Workspace(workspace)]));
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
