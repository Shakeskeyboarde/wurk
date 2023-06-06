import { type Commander } from '../commander/commander.js';
import { type InitContextOptions, type RootContextOptions, type WorkspaceContextOptions } from '../exports.js';
import { type Command, type CommandType } from './command.js';

export interface CommandPackage {
  readonly main: string;
  readonly dir: string;
  readonly name: string;
  readonly description: string | undefined;
  readonly version: string;
}
export interface LoadedCommandOptions {
  readonly command: Command<any, any>;
  readonly commandPackage: CommandPackage;
}

export class LoadedCommand implements CommandType<any, any> {
  #command: Command<any, any>;

  readonly package: CommandPackage;

  constructor({ command, commandPackage }: LoadedCommandOptions) {
    this.#command = command;
    this.package = commandPackage;
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
