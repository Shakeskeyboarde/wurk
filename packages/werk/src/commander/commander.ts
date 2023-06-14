import {
  type AddHelpTextContext,
  type AddHelpTextPosition,
  Command,
  type ErrorOptions,
  type Help,
  type OutputConfiguration,
} from '@commander-js/extra-typings';

import { log } from '../utils/log.js';
import { CommanderHelp } from './commander-help.js';
import { patchParseArgs } from './patch-parse-args.js';

interface Metadata {
  isVersionSet: boolean;
  isDescriptionSet: boolean;
}

export type CommanderArgs = unknown[];
export type CommanderOptions = Record<string, unknown>;

const META = Symbol();

class CommanderImplementation<A extends CommanderArgs = [], O extends CommanderOptions = {}> extends Command<A, O> {
  #actionHandler: ((...args: [...A, O, this]) => void | Promise<void>) | undefined;

  readonly [META]: Metadata = {
    isVersionSet: false,
    isDescriptionSet: false,
  };

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
      .showHelpAfterError()
      .enablePositionalOptions();
  }

  createCommand(): CommanderImplementation {
    throw new Error(`Werk does not support CommanderJS sub-commands.`);
  }

  createHelp(): Help {
    return new CommanderHelp();
  }

  option(flags: string, description?: string, parseArgs?: any, defaultValue?: any): any {
    parseArgs = patchParseArgs(parseArgs);
    super.option(flags, description as string, parseArgs, defaultValue);
    return this;
  }

  argument(name: string, description?: string, parseArgs?: any, defaultValue?: any): any {
    parseArgs = patchParseArgs(parseArgs);
    super.argument(name, description as string, parseArgs, defaultValue);
    return this;
  }

  action(): this {
    throw new Error(`Werk does not support CommanderJS action callbacks.`);
  }

  version(str: string, flags?: string, description?: string): this {
    this[META].isDescriptionSet = true;
    super.version(str, flags || '-v, --version', description || 'Print the version number.');
    return this;
  }

  helpOption(flags?: string, description?: string): this {
    super.helpOption(flags, description || 'Display this help message.');
    return this;
  }

  description(text?: string, argsDescription?: Record<string, string>): any {
    this[META].isDescriptionSet = true;
    if (typeof text === 'undefined') return super.description();
    const prev = this.description();
    text = prev ? `${prev}\n\n${text}` : text;
    if (argsDescription == null) super.description(text);
    else super.description(text, argsDescription);
    return this;
  }

  addHelpText(position: AddHelpTextPosition, text: string | ((context: AddHelpTextContext) => string)): this {
    const callback = (context: AddHelpTextContext): string => {
      const outputConfiguration = this.configureOutput();
      const helper = this.createHelp();
      const width = context.error ? outputConfiguration.getErrHelpWidth?.() : outputConfiguration.getOutHelpWidth?.();
      let str = typeof text === 'function' ? text(context) : text;
      str = helper.wrap(str, width || 80, 0);
      str = position === 'beforeAll' || position === 'before' ? `${str}\n` : `\n${str}`;
      return str;
    };

    return super.addHelpText(position, callback);
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

export const getCommanderMetadata = (command: Command): Metadata => {
  return (
    (command as CommanderImplementation)[META] ?? {
      isVersionSet: true,
      isDescriptionSet: true,
    }
  );
};

export const Commander = CommanderImplementation as new <A extends CommanderArgs = [], O extends CommanderOptions = {}>(
  name?: string,
) => Command<A, O>;
