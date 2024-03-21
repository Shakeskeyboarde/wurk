import { optionHelpTag, optionVersionTag } from './constants.js';
import { type Named } from './named.js';
import { type Positional } from './positional.js';
import { wrap } from './utils.js';

/**
 * The `Cli` definition to be formatted.
 */
export interface HelpCli {
  /**
   * The name of the command.
   */
  readonly name: string;
  /**
   * Aliases for the command.
   */
  readonly aliases: readonly string[];
  /**
   * Descriptions for the command.
   */
  readonly descriptions: readonly string[];
  /**
   * Trailers for the command.
   */
  readonly trailers: readonly string[];
  /**
   * Options supported by the command.
   */
  readonly options: readonly (Named | Positional)[];
  /**
   * Subcommands supported by the command.
   */
  readonly commands: readonly HelpCli[];
  /**
   * Parent command, if any.
   */
  readonly parent: HelpCli | null;
  /**
   * Whether a subcommand is optional.
   */
  readonly isCommandOptional: boolean;
  /**
   * Whether the command is the default subcommand of its parent.
   */
  readonly isDefault: boolean;
  /**
   * Whether the command is hidden from parent help text.
   */
  readonly isHidden: boolean;
}

/**
 * Formatter for Cli help text.
 */
export interface HelpFormatter {
  /**
   * Return the formatted help text for the given Cli.
   */
  format(cli: HelpCli, error: unknown): string;
}

const COLUMNS = Math.min(process.stdout.columns, 120);

const formatUsage = (cli: HelpCli): string => {
  let name = [cli.name, ...cli.aliases].join('|');

  for (let parent = cli.parent; parent; parent = parent.parent) {
    name = `${[parent.name, ...parent.aliases].join('|')} ${name}`;
  }

  let prefix = `Usage: ${name} `;
  let result = '';

  const newline = '\n' + ' '.repeat(prefix.length);
  const columns = COLUMNS - prefix.length;

  const named = cli.options.filter((option) => {
    return (
      option.type === 'named'
      && !option.hidden
      && option.meta !== optionHelpTag
      && option.meta !== optionVersionTag
    );
  });
  const isNamedRequired = cli.options.some(({ required }) => required);
  const namedUsage = named.length
    ? isNamedRequired
      ? ' <options>'
      : ' [options]'
    : '';

  const positional = cli.options.filter((option) => {
    return option.type === 'positional' && !option.hidden;
  });
  const positionalUsage = positional.reduce((previous, { usage }) => {
    return `${previous} ${usage}`;
  }, '');

  const commands = cli.commands.filter((command) => !command.isHidden);
  const isDefaultCommand = cli.commands.some((command) => command.isDefault);
  const commandUsage = commands.length
    ? cli.isCommandOptional || isDefaultCommand
      ? ' [command]'
      : ' <command>'
    : '';

  const optionHelp = cli.options.find((option): option is Named => {
    return (
      option.type === 'named' && option.meta === optionHelpTag && !option.hidden
    );
  });
  const optionVersion = cli.options.find((option): option is Named => {
    return (
      option.type === 'named'
      && option.meta === optionVersionTag
      && !option.hidden
    );
  });

  if (commandUsage) {
    result += `${prefix}${wrap(`${namedUsage}${commandUsage}`, columns, newline)}`;
  }
  else {
    result += `${prefix}${wrap(`${namedUsage}${positionalUsage}`, columns, newline)}`;
  }

  prefix = '\n' + name.padStart(prefix.length - 1) + ' ';

  if (commandUsage && positionalUsage) {
    result += `${prefix}${wrap(`${namedUsage}${positionalUsage}`, columns, newline)}`;
  }

  if (optionHelp) {
    result += `${prefix}${wrap(optionHelp.names.join('|'), columns, newline)}`;
  }

  if (optionVersion) {
    result += `${prefix}${wrap(optionVersion.names.join('|'), columns, newline)}`;
  }

  return result;
};

const formatDescription = (description: string): string => {
  return wrap(description, COLUMNS);
};

const formatOptions = (
  group: string,
  options: (Named | Positional)[],
): string => {
  options = options.filter((option) => !option.hidden);

  if (!options.length) return '';

  const usageLength = options.reduce((max, option) => {
    return Math.max(max, option.usage.length);
  }, 0);
  const columns = COLUMNS - usageLength - 4;
  const newline = '\n' + ' '.repeat(usageLength + 4);
  const result = options.reduce((previous, { usage, description }) => {
    return (
      previous
      + `\n  ${description ? `${usage.padEnd(usageLength)}  ${wrap(description, columns, newline)}` : usage}`
    );
  }, `${group}:`);

  return result;
};

const formatCommands = (commands: readonly HelpCli[]): string => {
  commands = commands.filter((command) => !command.isHidden);

  if (!commands.length) return '';

  const [commandMap, nameLength] = commands.reduce<
    [Record<string, HelpCli>, number]
  >(
    ([map, max], command) => {
      const name = [command.name, ...command.aliases].join('|');
      return [{ ...map, [name]: command }, Math.max(max, name.length)];
    },
    [{}, 0],
  );
  const columns = COLUMNS - nameLength - 4;
  const newline = '\n' + ' '.repeat(nameLength + 4);
  const result = Object.entries(commandMap)
    .reduce((previous, [name, { descriptions, isDefault }]) => {
      const description = `${descriptions[0] ?? ''}${isDefault ? ` (default)` : ''}`;

      return (
        previous
        + (description
          ? `\n  ${name.padEnd(nameLength)}  ${wrap(description, columns, newline)}`
          : `\n  ${name}`)
      );
    }, 'Commands:');

  return result;
};

const formatError = (error: unknown): string => {
  if (!error || error === true) return '';

  return wrap(String(error), COLUMNS);
};

const format = (cli: HelpCli, error: unknown): string => {
  const groups = Object.entries(
    cli.options.reduce<Record<string, (Named | Positional)[]>>((result, option) => {
      const groupName
            = option.group || (option.type === 'named' ? 'Options' : 'Arguments');

      return {
        ...result,
        [groupName]: [...(result[groupName] ?? []), option],
      };
    }, {}),
  );

  const helpText = [
    formatUsage(cli),
    ...cli.descriptions.map(formatDescription),
    ...groups.map(([groupName, groupOptions]) => {
      return formatOptions(groupName, groupOptions);
    }),
    formatCommands(cli.commands),
    ...cli.trailers.map(formatDescription),
  ]
    .filter(Boolean)
    .join('\n\n');

  const errorText = formatError(error);

  return `${helpText}${errorText ? `\n\n${errorText}` : '\n'}`;
};

/**
 * Default help formatter used if no custom formatter is provided.
 */
export const defaultHelpFormatter: HelpFormatter = { format };
