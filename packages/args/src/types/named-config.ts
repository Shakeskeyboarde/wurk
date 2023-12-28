import { type NamedParse } from './named-parse.js';

export interface NamedConfig<TUsage extends string, TValue, TRequired extends boolean, TMap extends boolean> {
  readonly description?: string;
  readonly required?: TRequired;
  readonly map?: TMap;
  readonly hidden?: boolean;
  readonly conflicts?: readonly string[];
  readonly parse?: NamedParse<TUsage, TValue, TMap>;
}
