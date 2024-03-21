import { isLiteralArg, type LiteralArg } from './args.js';

/**
 * Quote a list of arguments for pretty printing. This is not guaranteed to
 * produce a string that can be parsed by a shell, but it should be close.
 */
export const quote = (...args: readonly (string | LiteralArg)[]): string => {
  return args
    .map((arg) => {
      if (isLiteralArg(arg)) {
        return arg.literal;
      }

      if (/["`!#$^&*|?;<>(){}[\]\\]/u.test(arg)) {
        return `'${arg.replaceAll(/(['\\])/gu, '\\$1')}'`;
      }

      if (/['\s]/u.test(arg)) {
        return `"${arg}"`;
      }

      return arg;
    })
    .join(' ');
};
