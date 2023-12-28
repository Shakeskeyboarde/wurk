import { type NamedConfig } from './named-config.js';
import { type NamedKeys } from './named-keys.js';
import { type NamedNames } from './named-names.js';
import { type NamedValue } from './named-value.js';

export interface Named<TUsage extends string, TValue, TRequired extends boolean, TMap extends boolean>
  extends Required<NamedConfig<TUsage, TValue, TRequired, TMap>> {
  readonly usage: TUsage;
  readonly names: NamedNames<TUsage>;
  readonly keys: NamedKeys<TUsage>;
  readonly value: NamedValue<TUsage>;
}
