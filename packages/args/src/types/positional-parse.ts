import { type PositionalInitialValue } from './positional-initial-value.js';

export type PositionalParse<TUsage extends string, TValue> = (value: PositionalInitialValue<TUsage>) => TValue;
