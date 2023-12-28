import { type PositionalVariadic } from './positional-variadic.js';

export type PositionalDefaultValue<TUsage extends string> = PositionalVariadic<TUsage> extends true
  ? [string, ...string[]]
  : string;
