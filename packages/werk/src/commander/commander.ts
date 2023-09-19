import {
  type AddHelpTextContext,
  type AddHelpTextPosition,
  Command as Commander,
  type CommandUnknownOpts,
  type ErrorOptions,
  type OutputConfiguration,
} from '@commander-js/extra-typings';

import { log } from '../utils/log.js';
import { CustomHelp } from './help.js';

export type CommanderArgs = unknown[];
export type CommanderOptions = Record<string, unknown>;

declare module '@commander-js/extra-typings' {
  interface Command {
    /**
     * Allow partial command name matches.
     *
     * @returns `this` for command chaining.
     */
    allowPartialCommand(enable?: boolean): this;
  }
}

Object.assign(Commander.prototype, {
  allowPartialCommand(this: CommandUnknownOpts, enable = true): any {
    Object.assign(this, {
      _allowPartialCommand: enable,
    });

    return this;
  },
  _findCommand(this: CommandUnknownOpts, commandName: string | undefined): CommandUnknownOpts | undefined {
    if (!commandName || this.commands.length === 0) return undefined;

    const exact =
      /**
       * Prefer an exact name match over an alias in case of alias
       * overlaps.
       */
      this.commands.find((command) => command.name() === commandName) ??
      /**
       * Prefer an exact alias match over a partial name match.
       */
      this.commands.find((command) => command.aliases().includes(commandName));

    if (exact || !(this as any)._allowPartialCommand) return exact;

    const partials = this.commands.flatMap((command) => {
      return [command.name(), ...command.aliases()]
        .filter((name) => name.startsWith(commandName))
        .map((name) => ({ name, command }));
    });

    if (partials.length <= 1) return partials[0]?.command;

    throw new Error(
      `Command "${commandName}" is ambiguous. Did you mean one of the following?${partials.reduce(
        (result, partial) => `${result}\n  - ${partial.name}`,
        '',
      )}`,
    );
  },
});

export class CustomCommander<A extends CommanderArgs = [], O extends CommanderOptions = {}> extends Commander<A, O> {
  constructor(name?: string) {
    super(name);

    this.configureOutput({
      outputError: (str) => {
        str = str.trim();
        str = str.replace(
          /^error: ([a-z])(.*?)([.!?]?)$/u,
          (_, firstChar: string, rest: string, punctuation: string) =>
            `${firstChar.toUpperCase()}${rest}${punctuation || '.'}`,
        );
        log.error(str);
      },
    })
      .addHelpCommand(false)
      .helpOption('-h, --help', 'Display this help text.')
      .showHelpAfterError()
      .enablePositionalOptions()
      .passThroughOptions(false)
      .allowExcessArguments(false)
      .allowUnknownOption(false);
  }

  name(): string;
  name(name: string): this;
  name(name?: string): any {
    return name == null ? super.name() : super.name() ? this.alias(name) : this.name(name);
  }

  createCommand(name?: string): CustomCommander {
    return createCommander(name).copyInheritedSettings(this);
  }

  createHelp(): CustomHelp {
    return new CustomHelp();
  }

  addHelpText(position: AddHelpTextPosition, text: string | ((context: AddHelpTextContext) => string)): this {
    return super.addHelpText(position, (context: AddHelpTextContext): string => {
      const outputConfiguration = this.configureOutput();
      const helper = this.createHelp();
      const width = context.error ? outputConfiguration.getErrHelpWidth?.() : outputConfiguration.getOutHelpWidth?.();
      const str = (typeof text === 'function' ? text(context) : text).trim();

      return str && helper.wrap(str, width || 80, 0) + '\n';
    });
  }

  error(message: string, errorOptions?: ErrorOptions): never {
    // output handling
    const outputConfiguration = this.configureOutput() as Required<OutputConfiguration>;
    const showHelpAfterError = ((this as any)._showHelpAfterError as boolean | string | undefined) ?? true;

    if (typeof showHelpAfterError === 'string') {
      outputConfiguration.writeErr(`${showHelpAfterError}\n\n`);
    } else if (showHelpAfterError) {
      this.outputHelp({ error: true });
      outputConfiguration.writeErr('\n');
    }

    outputConfiguration.outputError(`${message}\n`, outputConfiguration.writeErr);

    // exit handling
    (this as any)._exit?.(errorOptions?.exitCode ?? 1, errorOptions?.code || 'commander.error', message);
    // Just in case the internal _exit method doesn't exit, we'll exit here.
    // eslint-disable-next-line unicorn/no-process-exit
    return process.exit(errorOptions?.exitCode ?? 1);
  }
}

export type AnyCustomCommander = CustomCommander<CommanderArgs, CommanderOptions>;

export const createCommander = (name?: string): CustomCommander => {
  return new CustomCommander(name);
};
