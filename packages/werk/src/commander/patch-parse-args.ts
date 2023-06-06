import { InvalidArgumentError } from '@commander-js/extra-typings';

export const patchParseArgs = (parseArgs: any): any => {
  return typeof parseArgs === 'function'
    ? (value: string, previous: any): any => {
        try {
          return parseArgs ? parseArgs(value, previous) : value;
        } catch (error: any) {
          if (error?.code === 'commander.invalidArgument') throw error;
          throw new InvalidArgumentError(error.message);
        }
      }
    : parseArgs;
};
