import { type PartialCli } from './cli.js';
import { optionHelpTag, optionVersionTag } from './constants.js';
import { type Named } from './named.js';
import { type Positional } from './positional.js';
import { wrap } from './utils.js';

type HelpCli = PartialCli<
  | 'name'
  | 'aliases'
  | 'descriptions'
  | 'trailers'
  | 'options'
  | 'commands'
  | 'parent'
  | 'isCommandOptional'
  | 'isDefault'
  | 'isHidden'
>;

interface HelpFormatter {
  format(cli: HelpCli, error: unknown): string;
}

const formatUsage = (cli: HelpCli): string => {
  let name = [cli.name, ...cli.aliases].join('|');

  for (let parent = cli.parent; parent; parent = parent.parent) {
    name = `${[parent.name, ...parent.aliases].join('|')} ${name}`;
  }

  let prefix = `Usage: ${name} `;
  let result = '';

  const newline = '\n' + ' '.repeat(prefix.length);
  const columns = process.stdout.columns - prefix.length;

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
  return wrap(description, process.stdout.columns);
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
  const columns = process.stdout.columns - usageLength - 4;
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
  const columns = process.stdout.columns - nameLength - 4;
  const newline = '\n' + ' '.repeat(nameLength + 4);
  const result = Object.entries(commandMap)
    .reduce(
      (previous, [name, { descriptions, isDefault }]) => {
        const description = `${descriptions[0] ?? ''}${isDefault ? ` (default)` : ''}`;

        return (
          previous
          + (description
            ? `\n  ${name.padEnd(nameLength)}  ${wrap(description, columns, newline)}`
            : `\n  ${name}`)
        );
      },
      'Commands:',
    );

  return result;
};

const formatError = (error: unknown): string => {
  if (error == null) return '';

  return wrap(String(error), process.stdout.columns);
};

const format = (cli: HelpCli, error: unknown): string => {
  const groups = Object.entries(
    cli.options.reduce<Record<string, (Named | Positional)[]>>(
      {},
    ),
  );

  return [
    formatUsage(cli),
    ...cli.descriptions.map(formatDescription),
    ...groups.map(([groupName, groupOptions]) => {
      return formatOptions(groupName, groupOptions);
    }),
    formatCommands(cli.commands),
    ...cli.trailers.map(formatDescription),
    formatError(error),
  ]
    .filter(Boolean)
    .join('\n\n');
};

const defaultHelpFormatter: HelpFormatter = { format };

export { defaultHelpFormatter, type HelpCli, type HelpFormatter };
