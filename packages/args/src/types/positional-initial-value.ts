import { type PositionalVariadic } from './positional-variadic.js';

export type PositionalInitialValue<TUsage extends string> = PositionalVariadic<TUsage> extends true
  ? [string, ...string[]]
  : string;
