import { type Commander } from '../commander/commander.js';
import { type InitContextOptions, type RootContextOptions, type WorkspaceContextOptions } from '../exports.js';
import { type Command, type CommandType } from './command.js';

export interface LoadedCommandOptions {
  readonly command: Command<any, any>;
  readonly main: string;
  readonly dir: string;
  readonly version: string;
  readonly description: string | undefined;
}

export class LoadedCommand implements CommandType<any, any> {
  #command: Command<any, any>;

  readonly main: string;
  readonly dir: string;
  readonly version: string;
  readonly description: string | undefined;

  constructor({ command, main, dir, version, description }: LoadedCommandOptions) {
    this.#command = command;
    this.main = main;
    this.dir = dir;
    this.version = version;
    this.description = description;
  }

  readonly init = (options: InitContextOptions): Commander<any, any> => {
    return this.#command.init(options);
  };

  readonly before = (options: Omit<RootContextOptions<any, any>, 'startWorker'>): Promise<void> => {
    return this.#command.before(options);
  };

  readonly each = (options: Omit<WorkspaceContextOptions<any, any>, 'startWorker'>): Promise<void> => {
    return this.#command.each(options);
  };

  readonly after = (options: Omit<RootContextOptions<any, any>, 'startWorker'>): Promise<void> => {
    return this.#command.after(options);
  };
}
