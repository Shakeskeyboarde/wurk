import { type UnknownResult } from './result.js';
import { type CamelCase } from './types.js';
import { camelCase } from './utils.js';

interface Positional extends PositionalUsage, Required<AnyPositionalConfig> {
  readonly type: 'positional';
}

interface PositionalUsage {
  readonly key: string;
  readonly usage: string;
  readonly variadic: boolean;
  readonly required: boolean;
}

interface PositionalConfig<
  TKey extends string | null,
  TValue,
  TParsedValue,
  TResult extends UnknownResult,
> {
  readonly key?: TKey;
  readonly description?: string;
  readonly group?: string;
  readonly hidden?: boolean;
  readonly meta?: unknown;
  readonly parse?: (
    value: TValue,
    result: TResult,
    key: TKey,
  ) => TKey extends string ? Exclude<TParsedValue, undefined | void> : void;
}

type PositionalUsageString = `<${string}>` | `[${string}]`;

type InferPositionalKey<TUsage extends PositionalUsageString> =
  TUsage extends `${
  | `<${infer TLabel}${'' | '...'}>`
  | `[${infer TLabel}${'' | '...'}]`}`
    ? CamelCase<
      Exclude<TLabel, `${string}${'<' | '>' | '[' | ']' | '.'}${string}`>
    >
    : never;

type InferPositionalRequired<TUsage extends PositionalUsageString> =
  TUsage extends `<${string}>` ? true : false;

type InferPositionalType<TUsage extends PositionalUsageString> = TUsage extends
  | `<${infer TLabel}>`
  | `[${infer TLabel}]`
  ? TLabel extends `${string}...`
    ? [string, ...string[]]
    : string
  : never;

type AnyPositionalConfig = PositionalConfig<string, any, any, UnknownResult>;

const createPositional = (
  usage: string,
  configOrDescription: AnyPositionalConfig | string = {},
): Positional => {
  const config = typeof configOrDescription === 'string'
    ? { description: configOrDescription }
    : configOrDescription;
  const parsedUsage = parseUsage(usage);

  return {
    type: 'positional',
    usage,
    required: parsedUsage.required,
    variadic: parsedUsage.variadic,
    description: config?.description ?? '',
    key: config?.key ?? parsedUsage.key,
    group: config?.group ?? '',
    hidden: config?.hidden ?? false,
    meta: config?.meta,
    parse: config?.parse ?? ((value: unknown) => value),
  };
};

const parseUsage = (usage: string): PositionalUsage => {
  const match = usage.match(/^(?:<([^\s=,|.<>[\]]+)(\.{3})?>|\[([^\s=,|.<>[\]]+)(\.{3})?\])$/u);

  if (!match) {
    throw new Error(`invalid positional "${usage}"`);
  }

  const key = camelCase((match[1] || match[3])!);
  const required = Boolean(match[1]);
  const variadic = Boolean(match[2] || match[4]);

  return { key, usage, variadic, required };
};

export {
  type AnyPositionalConfig,
  createPositional,
  type InferPositionalKey,
  type InferPositionalRequired,
  type InferPositionalType,
  type Positional,
  type PositionalConfig,
  type PositionalUsageString,
};
