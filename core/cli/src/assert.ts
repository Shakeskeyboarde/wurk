import { type UnknownCli } from './cli.js';
import { type Named } from './named.js';
import { type Positional } from './positional.js';

/**
 * Assert that the given name is a valid command (or alias) name.
 */
export const assertValidName = (name: string): void => {
  if (!name || /^-|[\s|]/u.test(name)) {
    throw new Error(`invalid name "${name}"`);
  }
};

/**
 * Assert that at most one of the conflict (`optionConflict()`) options is
 * positional. It wouldn't make sense to conflict two positional options,
 * because the second one would always be a conflict.
 */
export const assertNotConflictingTwoPositionalOptions = (conflictOptions: (Named | Positional)[]): void => {
  if (conflictOptions.filter((option) => option.type === 'positional').length > 1) {
    throw new Error('conflicts between two or more positional options are not supported');
  }
};

/**
 * Assert that the new option is uniquely named.
 */
export const assertUniqueOptionNames = (cli: UnknownCli, newOption: Named): void => {
  const duplicateName = newOption.names.find((name) => cli.options.some((option) => {
    return option.type === 'named' && option.names.includes(name);
  }));

  if (duplicateName) {
    throw new Error(`duplicate option name "${duplicateName}"`);
  }
};

/**
 * Assert that the new option has a unique key.
 */
export const assertUniqueOptionKey = (
  cli: UnknownCli,
  newOption: Named | Positional,
): void => {
  if (cli.options.some((option) => option.key === newOption.key)) {
    throw new Error(`option key "${newOption.key}" is not unique`);
  }
};

/**
 * Assert that there are no previous variadic positional options.
 */
export const assertVariadicPositionalOptionLast = (
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

/**
 * Assert that if the new option is required, all previous positional options
 * are also required.
 */
export const assertRequiredPositionalOptionsFirst = (
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

/**
 * Assert that if the new option is required, there are no commands.
 */
export const assertNoCommandsWithRequiredPositionalOption = (
  cli: UnknownCli,
  newOption: Positional,
): void => {
  if (newOption.required && cli.commands.length) {
    throw new Error(`required positional options are incompatible with commands`);
  }
};

/**
 * Assert that the new command is uniquely named.
 */
export const assertUniqueCommandName = (
  cli: UnknownCli,
  newCommand: UnknownCli,
): void => {
  if (cli.commands.some((command) => command.name === newCommand.name)) {
    throw new Error(`command name "${newCommand.name}" is not unique`);
  }
};

/**
 * Assert that there are no required positional options, before adding a
 * command.
 */
export const assertNoRequiredPositionalOptionsWithCommand = (cli: UnknownCli): void => {
  if (
    cli.options.some((option) => {
      return option.type === 'positional' && option.required;
    })
  ) {
    throw new Error(`commands are incompatible with required positional options`);
  }
};

/**
 * Assert that there are no default commands, before adding a positional
 * option.
 */
export const assertNoDefaultCommandWithPositionalOption = (cli: UnknownCli): void => {
  if (cli.commands.some((command) => command.isDefault)) {
    throw new Error(`default commands are incompatible with positional options`);
  }
};

/**
 * Assert that if the new command is the default command, there are are no
 * positional options.
 */
export const assertNoPositionalOptionsWithDefaultCommand = (
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
