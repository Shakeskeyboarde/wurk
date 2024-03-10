import { type UnknownResult } from './result.js';
import { type CamelCase, type LastValue, type Split } from './types.js';
import { camelCase } from './utils.js';

interface Named extends NamedUsage, Required<AnyNamedConfig> {
  readonly type: 'named';
}

interface NamedUsage {
  readonly key: string | null;
  readonly usage: string;
  readonly variadic: boolean;
  readonly names: readonly string[];
  readonly value: false | 'optional' | 'required';
}

interface NamedConfig<
  TKey extends string | null,
  TValue,
  TParsedValue,
  TRequired extends boolean,
  TMapped extends boolean,
  TResult extends UnknownResult,
> {
  readonly key?: TKey;
  readonly description?: string;
  readonly group?: string;
  readonly hidden?: boolean;
  readonly required?: TRequired;
  readonly mapped?: TMapped;
  readonly meta?: unknown;
  readonly parse?: (
    value: TValue,
    prev: TParsedValue | undefined,
    result: TResult,
    key: TKey,
  ) => TKey extends string
    ? Exclude<TParsedValue, undefined | void>
    : TParsedValue;
}

type NamedUsageString = `-${string}`;

type InferNamedKey<TUsage extends NamedUsageString> =
  LastValue<
    Split<TUsage, ',' | '|'>
  > extends `-${infer TPrefix}${'' | `${'=' | ' '}${string}`}`
    ? CamelCase<Exclude<TPrefix, `${string}${' ' | '='}${string}`>>
    : never;

type InferNamedType<TUsage extends NamedUsageString> = TUsage extends any
  ? TUsage extends `${'' | `${string}${' ' | '='}`}<${infer TLabel}>`
    ? TLabel extends `${string}...`
      ? [string, ...string[]]
      : string
    : TUsage extends `${'' | `${string}${' ' | '='}`}[${infer TContent}]`
      ? TContent extends `${string}...`
        ? [boolean | string, ...(boolean | string)[]]
        : boolean | string
      : boolean
  : never;

type AnyNamedConfig = NamedConfig<
  string | null,
  any,
  any,
  boolean,
  boolean,
  UnknownResult
>;

const createNamed = (
  usage: string,
  configOrDescription: AnyNamedConfig | string = {},
): Named => {
  const config = typeof configOrDescription === 'string'
    ? { description: configOrDescription }
    : configOrDescription;
  const parsedUsage = parseUsage(usage);

  return {
    type: 'named',
    ...parsedUsage,
    key: config.key ?? parsedUsage.key,
    description: config.description ?? '',
    group: config.group ?? '',
    hidden: config.hidden ?? false,
    required: config.required ?? false,
    mapped: config.mapped ?? false,
    meta: config.meta,
    parse:
      config.parse ?? (config.mapped
        ? parsedUsage.variadic
          ? (
            value: Record<string, boolean | string[]>,
            prev: Record<string, (boolean | string)[]> | undefined,
          ) => ({
            ...prev,
            ...Object.fromEntries(Object.entries(value)
              .map(([k, v]) => [
                k,
                [...(prev?.[k] ?? []), ...(Array.isArray(v) ? v : [v])],
              ])),
          }) satisfies Record<string, (boolean | string)[]>
          : (
            value: Record<string, boolean | string>,
            prev: Record<string, boolean | string> | undefined,
          ): Record<string, boolean | string> => ({
            ...prev,
            ...value,
          })
        : parsedUsage.variadic
          ? (
            value: boolean | string[],
            prev: (boolean | string)[] | undefined,
          ) => [
            ...(prev ?? []),
            ...(Array.isArray(value) ? value : [value]),
          ] satisfies (boolean | string)[]
          : (value: boolean | string): boolean | string => value),
  };
};

const parseUsage = (usage: string): NamedUsage => {
  const match = usage.match(/^(-[^\s=,|.<>[\]]+(?:(?:, ?| ?\| ?)-[^\s=,|.<>[\]]*)*)(?:[ =](?:<([^\s=,|.<>[\]]+)(\.{3})?>|\[([^\s=,|.<>[\]]+)(\.{3})?\]))?$/u);

  if (!match) {
    throw new Error(`invalid named option "${usage}"`);
  }

  const names = match[1]!
    .split(/[,|]/u)
    .map((name) => name.trim());
  const key = camelCase(names.at(-1)!);
  const value = Boolean(match[2] || match[4]);
  const required = Boolean(match[2]);
  const variadic = Boolean(match[3] || match[5]);

  return {
    usage,
    key,
    variadic,
    names,
    value: value && (required ? 'required' : 'optional'),
  };
};

export {
  type AnyNamedConfig,
  createNamed,
  type InferNamedKey,
  type InferNamedType,
  type Named,
  type NamedConfig,
  type NamedUsageString,
};
