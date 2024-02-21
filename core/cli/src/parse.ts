/* eslint-disable max-lines */
import { type PartialCli } from './cli.js';
import { CliParseError } from './error.js';
import { type Named } from './named.js';
import { type Positional } from './positional.js';
import { type UnknownResult } from './result.js';

type ParserCli = PartialCli<
  | 'name'
  | 'aliases'
  | 'options'
  | 'commands'
  | 'optionActions'
  | 'isUnknownNamedOptionAllowed'
  | 'isShortOptionMergingAllowed'
  | 'isCommandOptional'
  | 'isGreedy'
  | 'isDefault'
  | 'getHelpText'
  | 'printHelp'
>;

interface ParserParent {
  isNamed(arg: string): boolean;
  tryNamed(): Promise<boolean>;
}

interface ParserResult extends Pick<UnknownResult, 'name' | 'getHelpText' | 'printHelp'> {
  readonly options: Record<string, any>;
  readonly command: Record<string, ParserResult | undefined>;
  readonly parsed: Set<string>;
}

interface ParserNamedArg {
  readonly optionName: string;
  readonly mappedKey: string | undefined;
  readonly integralValue: string | undefined;
}

type ParserNamedOptionValue =
  | string
  | string[]
  | boolean
  | null
  | { [key: string]: string | string[] | boolean | null | undefined };

const noParent: ParserParent = {
  isNamed: () => false,
  tryNamed: () => Promise.resolve(false),
};

const parseNamedArg = (arg: string): ParserNamedArg | undefined => {
  const match = arg.match(/^(-[^=.]+)(?:\.([^=]*))?(?:=(.*))?$/u);

  if (!match) return;

  const [, optionName = '', mappedKey, integralValue] = match;

  return { optionName, mappedKey, integralValue };
};

const parseMergedShortNamesArg = (arg: string): string[] | undefined => {
  const match = arg.match(/^-([^-=.]{2,})([=.].*)?$/u);

  if (!match) return;

  const [, name, suffix = ''] = match as [string, string, string | undefined];
  const characters = name.split('');

  return characters.map((character, i) => `-${character}${i === characters.length - 1 ? suffix : ''}`);
};

/**
 * Parse CLI and commands recursively. The args array is mutable by design,
 * and arguments are consumed as they are parsed.
 */
const parseRecursive = async (
  args: string[],
  cli: ParserCli,
  parent: ParserParent = noParent,
  name = cli.name,
): Promise<ParserResult> => {
  const {
    options,
    optionActions,
    commands,
    isGreedy,
    isUnknownNamedOptionAllowed,
    isShortOptionMergingAllowed,
    isCommandOptional,
    getHelpText,
    printHelp,
  } = cli;
  const named = options.filter((option): option is Named => option.type === 'named');
  const positional = options.filter((option): option is Positional => option.type === 'positional');
  const result: ParserResult = {
    options: Object.create(null),
    command: Object.create(null),
    parsed: new Set(),
    name,
    getHelpText: getHelpText.bind(cli),
    printHelp: printHelp.bind(cli),
  };
  const keylessValues = new Map<Named | Positional, any>();

  let isDoubleHyphenFound = false;
  let isPositionalFound = false;
  let isCommandFound = false;

  if (isGreedy) {
    // Ignore the parent if the current CLI is greedy.
    parent = noParent;
  }

  /**
   * Check if the argument is a named option in the current CLI, or in a
   * parent if the current CLI is not greedy.
   */
  const isNamed = (arg: string): boolean => {
    if (isDoubleHyphenFound) return false;

    const optionName = arg.split(/[.=]/u)[0]!;

    if (named.some(({ names }) => names.includes(optionName))) return true;
    if (parent.isNamed(arg)) return true;

    return false;
  };

  /**
   * Consume value args from the args array until the option is satisfied, an
   * argument which cannot be used as a value is encountered (eg. a named
   * option), or there are no more arguments.
   */
  const getOptionValueArgs = async (option: Named | Positional): Promise<string[]> => {
    if (option.type === 'named' && !option.value) return [];

    const valueArgs: string[] = [];

    while (args.length) {
      if (tryDoubleHyphen()) {
        if (option.type === 'named') break;
        else continue;
      }

      if (isNamed(args[0]!)) break;

      valueArgs.push(args.shift()!);

      // Consume only one argument if the option isn't variadic.
      if (!option.variadic) break;
    }

    return valueArgs;
  };

  /**
   * Convert the raw option values (an array of strings) into the correct
   * value type for the option's parse function.
   */
  const getOptionValue = (
    option: Named | Positional,
    valueArgs: string[],
    mappedKey?: string,
  ): ParserNamedOptionValue => {
    if (option.type === 'named') {
      if (option.mapped) {
        if (mappedKey == null) {
          throw new CliParseError(`option "${option.usage}" does not support dot notation`, { cli: cli });
        }
      } else if (/* not mapped and */ mappedKey != null) {
        throw new CliParseError(`option "${option.usage}" requires dot notation`, { cli: cli });
      }

      if (option.value === 'required' && valueArgs.length === 0) {
        throw new CliParseError(`option "${option.usage}" requires a value`, { cli: cli });
      }
    }

    let value: ParserNamedOptionValue =
      valueArgs.length === 0
        ? // There are no values, so this must be a named option which does
          // not accept a value or has an optional value which was not
          // provided. Either way, it behaves like a flag (boolean).
          // Positional options will always have at least one value.
          true
        : option.variadic
          ? // The option accepts multiple values, so use the array as-is.
            valueArgs
          : // The option accepts a single value, so use the first array value.
            // This should be the only value because the `getValueArgs`
            // function should not collect more then the option accepts.
            valueArgs[0]!;

    if (mappedKey != null) {
      // The option is mapped (supports dot notation), so wrap the value in an
      // object with the key as the only property name.
      value = { [mappedKey]: value };
    }

    return value;
  };

  /**
   * Consume the current argument if it's the first double hyphen encountered
   * by this CLI.
   */
  const tryDoubleHyphen = (): boolean => {
    if (isDoubleHyphenFound) return false;
    if (args[0] !== '--') return false;

    // Double hyphen matched, consume the argument.
    args.shift();
    isDoubleHyphenFound = true;

    return true;
  };

  /**
   * If the current argument matches a named option, consume it and any
   * additional arguments required for the option value.
   */
  const tryNamed = async (): Promise<boolean> => {
    // Not parsing named options if a double hyphen was found.
    if (isDoubleHyphenFound) return false;

    const parsed = parseNamedArg(args[0]!);

    if (!parsed) return false;

    const { optionName, mappedKey, integralValue } = parsed;
    const option = named.find(({ names }) => names.includes(optionName));

    if (!option) {
      // Try the parent if the current CLI doesn't have a matching option.
      if (await parent.tryNamed()) return true;

      return false;
    }

    // Named option matched, consume the argument.
    args.shift();

    const valueArgs = integralValue ? [integralValue] : await getOptionValueArgs(option);
    const valueRaw = getOptionValue(option, valueArgs, mappedKey);
    const valuePrev = option.key ? result.options[option.key] : keylessValues.get(option);
    const value = option.parse(valueRaw, valuePrev, result, option.key);

    keylessValues.set(option, value);

    // If the option is keyless, then it will not be included in the result,
    // and no per-option actions will be run.
    if (option.key == null) return true;

    result.options[option.key] = value;
    result.parsed.add(option.key);

    const actions = optionActions[option.key] ?? [];

    for (const action of actions) {
      await action({ result, key: option.key, value: valueRaw });
    }

    return true;
  };

  const tryMergedNamed = (): boolean => {
    if (!isShortOptionMergingAllowed && !isDoubleHyphenFound) return false;

    const shortNames = parseMergedShortNamesArg(args[0]!);

    if (!shortNames?.every(isNamed)) return false;

    // Replace the current argument with the split short options.
    args.splice(0, 1, ...shortNames);

    // The current argument was "handled".
    return true;
  };

  /**
   * If the current argument matches a command, consume it and delegate all
   * remaining argument parsing. If this function returns true, the args array
   * should be empty.
   */
  const tryCommand = async (): Promise<boolean> => {
    if (isPositionalFound) return false;

    const command = commands.find((value) => value.name === args[0] || value.aliases.includes(args[0]!));

    if (!command) return false;

    const commandName = args.shift();
    isCommandFound = true;
    result.command[command.name] = await parseRecursive(args, command, { isNamed, tryNamed }, commandName);

    return true;
  };

  /**
   * If there is a default command, use it and delegate all remaining argument
   * parsing. If this function returns true, the args array should be empty.
   */
  const tryDefaultCommand = async (): Promise<boolean> => {
    if (isPositionalFound) return false;

    const command = commands.find(({ isDefault }) => isDefault);

    if (!command) return false;

    isCommandFound = true;
    result.command[command.name] = await parseRecursive(args, command, { isNamed, tryNamed });

    return true;
  };

  /**
   * If there is an unsatisfied positional option remaining, consume the
   * current argument and any additional arguments required for the option
   * value.
   */
  const tryPositional = async (): Promise<boolean> => {
    if (positional.length === 0) return false;

    const option = positional[0]!;
    const valueArgs = await getOptionValueArgs(option);

    // Even if the positional is optional, it must consume at least one
    // argument to be considered "matched".
    if (valueArgs.length === 0) return false;

    // Positional option matched, consume the option. Arguments were already
    // consumed by `getOptionValueArgs`.
    positional.shift();
    isPositionalFound = true;

    const value = getOptionValue(option, valueArgs);

    result.options[option.key] = option.parse(value, result, option.key);
    result.parsed.add(option.key);

    return true;
  };

  while (args.length) {
    // Each "try" function will check next argument (ie. `args[0]`) to see if
    // it matches the function's criteria. If it does, the function will
    // consume one or more leading arguments (unshift) and return true.

    if (tryDoubleHyphen()) continue;
    if (await tryNamed()) continue;
    if (tryMergedNamed()) continue;
    if (await tryCommand()) continue;
    if (await tryDefaultCommand()) continue;

    if (args[0]!.startsWith('-') && !isUnknownNamedOptionAllowed && !isDoubleHyphenFound) {
      throw new CliParseError(`unknown option "${args[0]}"`, { cli: cli });
    }

    if (await tryPositional()) continue;

    throw new CliParseError(`unexpected argument "${args[0]}"`, { cli: cli });
  }

  if (!isCommandFound) {
    // It's possible that all the args were named options (or there were no
    // args), in which case the default command would not have been used. So
    // use the default command if it exists, after all the args have been
    // consumed.
    await tryDefaultCommand();
  }

  named.forEach(({ key, usage, required }) => {
    if (required && key != null && result.options[key] === undefined) {
      throw new CliParseError(`missing required option "${usage}"`, { cli: cli });
    }
  });

  if (positional[0]?.required) {
    throw new CliParseError(`missing required option "${positional[0].usage}"`, { cli: cli });
  }

  if (!isCommandFound && !isCommandOptional && commands.length) {
    throw new CliParseError('missing required command', { cli: cli });
  }

  return result;
};

/**
 * Use the CLI to parse the arguments.
 */
const parse = async (cli: ParserCli, args: readonly string[]): Promise<UnknownResult> => {
  return await parseRecursive([...args], cli);
};

export { parse };
