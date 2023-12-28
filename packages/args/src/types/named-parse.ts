import { type NamedParseContext } from './named-parse-context.js';

export type NamedParse<TUsage extends string, TValue, TMap extends boolean> = (
  ctx: NamedParseContext<TUsage, TMap>,
  previous: TValue | undefined,
) => TValue;
