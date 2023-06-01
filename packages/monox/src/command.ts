import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';

import { type Command } from '@commander-js/extra-typings';
import findRoot from 'find-root';

import { abort } from './abort.js';
import { type Log, log } from './log.js';
import { type Spawn } from './spawn.js';
import { type Workspace } from './workspaces.js';

export type CommanderCommand<A extends any[], O extends {}> = Command<A, O>;

interface CommandContextOptions<T extends CommanderCommand<any, any>> {
  command: T;
  path: string;
  log?: Log;
  spawn: Spawn;
  getWorkspaces: () => Promise<ReadonlyMap<string, Workspace>>;
}

const require = createRequire(import.meta.url);

export interface CommandInitContext {
  /**
   * Absolute path of the workspaces root.
   */
  readonly path: string;

  /**
   * Logger.
   */
  readonly log: Log;

  /**
   * Abort the process with an optional error message and exit code.
   */
  readonly abort: () => never;
}

export class CommandContext<T extends CommanderCommand<any, any>> implements CommandInitContext {
  #command: T;

  /**
   * Absolute path of the workspaces root or a single workspace.
   */
  readonly path: string;

  /**
   * Logger.
   */
  readonly log: Log;

  get opts(): T['opts'] {
    return this.#command.opts() as T['opts'];
  }

  get args(): T['processedArgs'] {
    return this.#command.processedArgs as T['processedArgs'];
  }

  constructor(options: CommandContextOptions<T>) {
    ({
      command: this.#command,
      path: this.path,
      log: this.log = log,
      spawn: this.spawn,
      getWorkspaces: this.getWorkspaces,
    } = options);
  }

  /**
   * Abort the process with an optional error message and exit code.
   */
  readonly abort = abort;

  /**
   * Spawn a child process at the workspace root.
   */
  readonly spawn: Spawn;

  /**
   * Get all NPM workspaces in order of interdependency (dependencies
   * before dependents).
   */
  readonly getWorkspaces: () => Promise<ReadonlyMap<string, Workspace>>;
}

export type CommandInit<T extends CommanderCommand<any, any>> = (
  command: CommanderCommand<[], {}>,
  context: CommandInitContext,
) => T;

export interface CommandOptions<T extends CommanderCommand<any, any>, A extends T> {
  version?: string | false;
  description?: string;
  init: CommandInit<T>;
  before?: (context: CommandContext<A>) => Promise<void> | void;
  each?: (workspace: Workspace, context: CommandContext<A>) => Promise<void> | void;
  after?: (context: CommandContext<A>) => Promise<void> | void;
}

export interface CommandModule<T extends CommanderCommand<any, any>, A extends T> {
  version?: string;
  description?: string;
  init: CommandInit<T>;
  before?: (context: CommandContext<A>) => Promise<void> | void;
  each?: (workspace: Workspace, context: CommandContext<A>) => Promise<void> | void;
  after?: (context: CommandContext<A>) => Promise<void> | void;
}

export const createCommand = <T extends CommanderCommand<any, any>, A extends T>(
  initOrOptions: CommandInit<T> | CommandOptions<T, A>,
): CommandOptions<T, A> => {
  return typeof initOrOptions === 'function' ? { init: initOrOptions } : initOrOptions;
};

export const loadCommand = async (
  name: string,
): Promise<CommandModule<CommanderCommand<[], {}>, CommanderCommand<[], {}>>> => {
  const id = `monox-command-${name}`;
  const { default: options }: { default: CommandOptions<CommanderCommand<[], {}>, CommanderCommand<[], {}>> } =
    await import(id).catch(() => {
      abort(`Command "${name}" not found. Do you need to install the "${id}" plugin package?`);
    });

  if (typeof options !== 'object' || options === null || typeof options.init !== 'function') {
    abort(`Command "${name}" did not export a valid plugin as default.`);
  }

  const { version, ...otherOptions } = options;
  const module: CommandModule<CommanderCommand<[], {}>, CommanderCommand<[], {}>> = {
    version:
      version === false
        ? undefined
        : typeof version === 'string'
        ? version
        : await Promise.resolve()
            .then(() => findRoot(dirname(require.resolve(id))))
            .then((dir) => JSON.parse(readFileSync(`${dir}/package.json`, 'utf-8')))
            .then((pkg?: { version?: unknown }) => (typeof pkg?.version === 'string' ? pkg.version : undefined))
            .catch(() => undefined),
    ...otherOptions,
  };

  return module;
};
