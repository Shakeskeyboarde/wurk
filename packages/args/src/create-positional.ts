import { type Positional } from './types/positional.js';
import { type PositionalConfig } from './types/positional-config.js';
import { type PositionalDefaultValue } from './types/positional-default-value.js';
import { type PositionalParse } from './types/positional-parse.js';
import { type PositionalRequired } from './types/positional-required.js';
import { type PositionalVariadic } from './types/positional-variadic.js';

export const createPositional = <TUsage extends `<${string}>` | `[${string}]`, TValue = PositionalDefaultValue<TUsage>>(
  usage: TUsage,
  config: PositionalConfig<TUsage, TValue> = {},
): Positional<TUsage, TValue> => {
  if (!/<[^\s=,|.<>[\]]+>|\[[^\s=,|.<>[\]]+\]/u.test(usage)) {
    throw new Error(`Invalid positional "${usage}"`);
  }

  const variadic = /^[<\]]..|..[<\]]$/u.test(usage) as PositionalVariadic<TUsage>;
  const required = usage.startsWith('<') as PositionalRequired<TUsage>;
  const { description = '', parse = ((value: any): any => value) as PositionalParse<TUsage, TValue> } = config;

  return { usage, description, required, variadic, parse };
};
