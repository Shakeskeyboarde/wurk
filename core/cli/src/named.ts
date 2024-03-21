import { type UnknownResult } from './result.js';
import { type CamelCase, type LastValue, type Split } from './types.js';
import { camelCase } from './utils.js';

interface NamedUsage {
  readonly key: string | null;
  readonly usage: string;
  readonly variadic: boolean;
  readonly names: readonly string[];
  readonly value: false | 'optional' | 'required';
}

/**
 * Named option.
 */
export interface Named extends NamedUsage, Required<AnyNamedConfig> {
  /**
   * Type of the option.
   */
  readonly type: 'named';
}

/**
 * Configuration for a named option.
 */
export interface NamedConfig<
  TKey extends string | null,
  TValue,
  TParsedValue,
  TRequired extends boolean,
  TMapped extends boolean,
  TResult extends UnknownResult,
> {
  /**
   * Explicit key for the option if the default key is overridden.
   */
  readonly key?: TKey;
  /**
   * Description of the option.
   */
  readonly description?: string;
  /**
   * Help group name for the option.
   */
  readonly group?: string;
  /**
   * Whether the option is hidden from help text.
   */
  readonly hidden?: boolean;
  /**
   * Whether the option is required.
   */
  readonly required?: TRequired;
  /**
   * Whether the option is mapped to a key-value object.
   */
  readonly mapped?: TMapped;
  /**
   * Additional metadata for the option. Used internally to tag implicitly
   * added help and version options so that they can be overridden by
   * explicitly added options.
   */
  readonly meta?: unknown;
  /**
   * Custom parser for the option value.
   */
  readonly parse?: (value: TValue, prev: TParsedValue | undefined, result: TResult, key: TKey,
  ) => TKey extends string
    ? Exclude<TParsedValue, undefined | void>
    : TParsedValue;
}

/**
 * Template type for named option usage strings, which must always start with
 * a hyphen.
 */
export type NamedUsageString = `-${string}`;

/**
 * Infer the implicit key of a named option from its usage string. This will
 * be the camel-cased version of the last flag in the usage string.
 */
export type InferNamedKey<TUsage extends NamedUsageString> =
  LastValue<
    Split<TUsage, ',' | '|'>
  > extends `-${infer TPrefix}${'' | `${'=' | ' '}${string}`}`
    ? CamelCase<Exclude<TPrefix, `${string}${' ' | '='}${string}`>>
    : never;

/**
 * Infer the raw argument type that will be passed to the option parser.
 */
export type InferNamedArgType<TUsage extends NamedUsageString> = TUsage extends any
  ? TUsage extends `${'' | `${string}${' ' | '='}`}<${string}>`
    ? string
    : TUsage extends `${'' | `${string}${' ' | '='}`}[${string}]`
      ? boolean | string
      : boolean
  : never;

/**
 * Infer the default result type if no custom parser is provided.
 */
export type InferNamedResultType<TUsage extends NamedUsageString> = TUsage extends any
  ? TUsage extends `${'' | `${string}${' ' | '='}`}<${infer TLabel}>`
    ? TLabel extends `${string}...`
      ? string[]
      : string
    : TUsage extends `${'' | `${string}${' ' | '='}`}[${infer TContent}]`
      ? TContent extends `${string}...`
        ? (boolean | string)[]
        : boolean | string
      : boolean
  : never;

/**
 * Placeholder for any named option configuration.
 */
export type AnyNamedConfig = NamedConfig<
  string | null,
  any,
  any,
  boolean,
  boolean,
  UnknownResult
>;

/**
 * Create a named option.
 */
export const createNamed = (
  usage: string,
  configOrDescription: NamedConfig<string | null, any, any, boolean, boolean, UnknownResult> | string = {},
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
