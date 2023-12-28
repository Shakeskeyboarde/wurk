import { type NamedValue } from './named-value.js';

export type NamedInitialValue<TUsage extends string> = NamedValue<TUsage> extends false
  ? boolean
  : NamedValue<TUsage> extends { required: true }
    ? NamedValue<TUsage> extends { variadic: true }
      ? [string, ...string[]]
      : string
    : NamedValue<TUsage> extends { variadic: true }
      ? string[]
      : string | true;
