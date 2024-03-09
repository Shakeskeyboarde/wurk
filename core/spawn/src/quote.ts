import { isLiteralArg, type LiteralArg } from './args.js';

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
