import { type PositionalConfig } from './positional-config.js';
import { type PositionalRequired } from './positional-required.js';
import { type PositionalVariadic } from './positional-variadic.js';

export interface Positional<TUsage extends string, TValue> extends Required<PositionalConfig<TUsage, TValue>> {
  readonly usage: TUsage;
  readonly required: PositionalRequired<TUsage>;
  readonly variadic: PositionalVariadic<TUsage>;
}
