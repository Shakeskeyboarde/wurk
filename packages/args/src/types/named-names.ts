import { type Split } from './utilities.js';

export type NamedNames<
  TUsage extends string,
  TUsageUnion = Split<TUsage, ',' | '|'>[number],
> = readonly (TUsageUnion extends `-${string}`
  ? TUsageUnion extends `${infer T0}${'=' | ' '}${string}`
    ? T0
    : TUsageUnion
  : never)[];
