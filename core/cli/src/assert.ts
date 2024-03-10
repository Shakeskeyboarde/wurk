import { type UnknownCli } from './cli.js';
import { type Named } from './named.js';
import { type Positional } from './positional.js';

const assertValidName = (name: string): void => {
  if (!name || /^-|[\s|]/u.test(name)) {
    throw new Error(`invalid name "${name}"`);
  }
};

const assertNotConflictingTwoPositionalOptions = (options: (Named | Positional)[]): void => {
  if (options.filter((option) => option.type === 'positional').length > 1) {
    throw new Error('conflicts between two or more positional options are not supported');
  }
};

const assertUniqueOptionNames = (cli: UnknownCli, newOption: Named): void => {
  const duplicateName = newOption.names.find((name) => cli.options.some((option) => {
    return option.type === 'named' && option.names.includes(name);
  }));

  if (duplicateName) {
    throw new Error(`duplicate option name "${duplicateName}"`);
  }
};

const assertUniqueOptionKey = (
  cli: UnknownCli,
  newOption: Named | Positional,
): void => {
  if (cli.options.some((option) => option.key === newOption.key)) {
    throw new Error(`option key "${newOption.key}" is not unique`);
  }
};

const assertVariadicPositionalOptionLast = (
  cli: UnknownCli,
  newOption: Positional,
): void => {
  if (
    cli.options.some((option) => {
      return option.type === 'positional' && option.variadic;
    })
  ) {
    if (newOption.variadic) {
      throw new Error(`only one variadic positional option is allowed`);
    }
    else {
      throw new Error(`additional positional options cannot follow a variadic positional option`);
    }
  }
};

const assertRequiredPositionalOptionsFirst = (
  cli: UnknownCli,
  newOption: Positional,
): void => {
  if (
    newOption.required
    && cli.options.some((option) => {
      return option.type === 'positional' && !option.required;
    })
  ) {
    throw new Error(`required positional options cannot follow non-required positional options`);
  }
};

const assertNoCommandsWithRequiredPositionalOption = (
  cli: UnknownCli,
  newOption: Positional,
): void => {
  if (newOption.required && cli.commands.length) {
    throw new Error(`required positional options are incompatible with commands`);
  }
};

const assertUniqueCommandName = (
  cli: UnknownCli,
  newCommand: UnknownCli,
): void => {
  if (cli.commands.some((command) => command.name === newCommand.name)) {
    throw new Error(`command name "${newCommand.name}" is not unique`);
  }
};

const assertNoRequiredPositionalOptionsWithCommand = (cli: UnknownCli): void => {
  if (
    cli.options.some((option) => {
      return option.type === 'positional' && option.required;
    })
  ) {
    throw new Error(`commands are incompatible with required positional options`);
  }
};

const assertNoDefaultCommandWithPositionalOption = (cli: UnknownCli): void => {
  if (cli.commands.some((command) => command.isDefault)) {
    throw new Error(`default commands are incompatible with positional options`);
  }
};

const assertNoPositionalOptionsWithDefaultCommand = (
  cli: UnknownCli,
  newCommand: UnknownCli,
): void => {
  if (
    newCommand.isDefault
    && cli.options.some((option) => option.type === 'positional')
  ) {
    throw new Error(`positional options are incompatible with default commands`);
  }
};

export {
  assertNoCommandsWithRequiredPositionalOption,
  assertNoDefaultCommandWithPositionalOption,
  assertNoPositionalOptionsWithDefaultCommand,
  assertNoRequiredPositionalOptionsWithCommand,
  assertNotConflictingTwoPositionalOptions,
  assertRequiredPositionalOptionsFirst,
  assertUniqueCommandName,
  assertUniqueOptionKey,
  assertUniqueOptionNames,
  assertValidName,
  assertVariadicPositionalOptionLast,
};
