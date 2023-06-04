import {
  type AddHelpTextContext,
  type AddHelpTextPosition,
  Command,
  type ErrorOptions,
  Help,
  type OutputConfiguration,
} from '@commander-js/extra-typings';
import { InvalidArgumentError } from 'commander';

import { log } from './log.js';

class CommanderHelp extends Help {
  wrap(str: string, width: number, indent: number, minColumnWidth?: number): string {
    str = str.replace(/\n[^\S\r\n]+/gu, '\n').replace(/(?<!\n)\n(?!\n)/gu, ' ');
    return super.wrap(str, width, indent, minColumnWidth);
  }

  formatHelp(commander: Command, helper: Help): string {
    const helpWidth = helper.helpWidth || 80;
    const itemIndentWidth = 2;
    const itemSeparatorWidth = 3; // between term and description

    const formatItem = (term: string, description: string, termWidth: number): string => {
      if (description) {
        const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`;
        return helper.wrap(fullText, helpWidth - itemIndentWidth, termWidth + itemSeparatorWidth);
      }
      return term;
    };

    const formatList = (textArray: string[]): string => {
      return textArray.join('\n').replace(/^/gm, ' '.repeat(itemIndentWidth));
    };

    // Usage

    let output = [`Usage: ${helper.commandUsage(commander)}`, ''];

    // Description

    const commandDescription = helper.commandDescription(commander);

    if (commandDescription.length > 0) {
      output = output.concat([helper.wrap(commandDescription, helpWidth, 0), '']);
    }

    // Options

    const optionList = helper.visibleOptions(commander).map((option) => {
      return formatItem(
        helper.optionTerm(option),
        helper.optionDescription(option),
        helper.longestOptionTermLength(commander, helper),
      );
    });

    if (optionList.length > 0) {
      output = output.concat(['Options:', formatList(optionList), '']);
    }

    if (this.showGlobalOptions) {
      const globalOptionList = helper.visibleGlobalOptions(commander).map((option) => {
        return formatItem(
          helper.optionTerm(option),
          helper.optionDescription(option),
          helper.longestGlobalOptionTermLength(commander, helper),
        );
      });

      if (globalOptionList.length > 0) {
        output = output.concat(['Global Options:', formatList(globalOptionList), '']);
      }
    }

    // Arguments

    const argumentList = helper.visibleArguments(commander).map((argument) => {
      return formatItem(
        helper.argumentTerm(argument),
        helper.argumentDescription(argument),
        helper.longestArgumentTermLength(commander, helper),
      );
    });

    if (argumentList.length > 0) {
      output = output.concat(['Arguments:', formatList(argumentList), '']);
    }

    // Commands

    const commandList = helper.visibleCommands(commander).map((cmd) => {
      return formatItem(
        helper.subcommandTerm(cmd),
        helper.subcommandDescription(cmd),
        helper.longestSubcommandTermLength(commander, helper),
      );
    });

    if (commandList.length > 0) {
      output = output.concat(['Commands:', formatList(commandList), '']);
    }

    return output.join('\n');
  }
}

class Commander<A extends any[] = [], O extends {} = {}> extends Command<A, O> {
  #actionHandler: ((...args: [...A, O, this]) => void | Promise<void>) | undefined;

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

  createCommand(name: string): Commander {
    return new Commander(name);
  }

  createHelp(): CommanderHelp {
    return new CommanderHelp();
  }

  option(flags: string, description?: string, parseArgs?: any, defaultValue?: any): Command<any, any> {
    const parseArgs_ =
      typeof parseArgs === 'function'
        ? (value: string, previous: any): any => {
            try {
              return parseArgs ? parseArgs(value, previous) : value;
            } catch (error: any) {
              if (error?.code === 'commander.invalidArgument') throw error;
              throw new InvalidArgumentError(error.message);
            }
          }
        : parseArgs;
    super.option(flags, description as string, parseArgs_, defaultValue);
    return this;
  }

  argument(name: string, description?: string, parseArgs?: any, defaultValue?: any): Command<any, any> {
    const parseArgs_ =
      typeof parseArgs === 'function'
        ? (value: string, previous: any): any => {
            try {
              return parseArgs ? parseArgs(value, previous) : value;
            } catch (error: any) {
              if (error?.code === 'commander.invalidArgument') throw error;
              throw new InvalidArgumentError(error.message);
            }
          }
        : parseArgs;
    super.argument(name, description as string, parseArgs_, defaultValue);
    return this;
  }

  action(fn: (...args: [...A, O, this]) => void | Promise<void>): this {
    const prev = this.#actionHandler;

    this.#actionHandler = (...args) => {
      const result = prev?.(...args);
      return typeof result?.then === 'function' ? result.then(() => fn(...args)) : fn(...args);
    };

    return super.action(this.#actionHandler);
  }

  version(str: string, flags?: string, description?: string): this {
    return super.version(str, flags || '-v, --version', description || 'Print the version number.');
  }

  helpOption(flags?: string, description?: string): this {
    return super.helpOption(flags, description || 'Display this help message.');
  }

  description(): string;
  description(text: string, argsDescription?: Record<string, string>): this;
  description(text?: string, argsDescription?: Record<string, string>): this | string {
    if (text == null) return super.description();
    const prev = this.description();
    text = prev ? `${prev}\n\n${text}` : text;
    return argsDescription == null ? super.description(text) : super.description(text, argsDescription);
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

export const createCommander = (name?: string): Command => {
  return new Commander(name);
};
