import { type PositionalParse } from './positional-parse.js';

export interface PositionalConfig<TUsage extends string, TValue> {
  description?: string;
  parse?: PositionalParse<TUsage, TValue>;
}
