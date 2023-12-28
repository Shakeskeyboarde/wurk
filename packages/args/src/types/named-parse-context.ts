import { type NamedInitialValue } from './named-initial-value.js';

export interface NamedParseContext<TUsage extends string, TMap extends boolean> {
  readonly value: NamedInitialValue<TUsage>;
  readonly key: TMap extends true ? string : undefined;
}
