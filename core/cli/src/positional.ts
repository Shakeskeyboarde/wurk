import { type UnknownResult } from './result.js';
import { type CamelCase } from './types.js';
import { camelCase } from './utils.js';

interface PositionalUsage {
  readonly key: string;
  readonly usage: string;
  readonly variadic: boolean;
  readonly required: boolean;
}

/**
 * Positional option (argument).
 */
export interface Positional extends PositionalUsage, Required<AnyPositionalConfig> {
  /**
   * Type of the option.
   */
  readonly type: 'positional';
}

/**
 * Configuration for a positional option.
 */
export interface PositionalConfig<
  TKey extends string | null,
  TValue,
  TParsedValue,
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
   * Additional metadata for the option.
   */
  readonly meta?: unknown;
  /**
   * Custom parser for the option value.
   */
  readonly parse?: (
    value: TValue,
    result: TResult,
    key: TKey,
  ) => TKey extends string ? Exclude<TParsedValue, undefined | void> : void;
}

/**
 * Template type for positional option usage strings, which must always be
 * enclosed in angle brackets or square brackets.
 */
export type PositionalUsageString = `<${string}>` | `[${string}]`;

/**
 * Infer the implicit key of a positional option from its usage string. This
 * will be  the camel-cased version of the usage string without the enclosing
 * brackets.
 */
export type InferPositionalKey<TUsage extends PositionalUsageString> =
  TUsage extends `${
  | `<${infer TLabel}${'' | '...'}>`
  | `[${infer TLabel}${'' | '...'}]`}`
    ? CamelCase<
      Exclude<TLabel, `${string}${'<' | '>' | '[' | ']' | '.'}${string}`>
    >
    : never;

/**
 * Infer whether a positional option is required from its usage string.
 */
export type InferPositionalRequired<TUsage extends PositionalUsageString> =
  TUsage extends `<${string}>` ? true : false;

/**
 * Infer the raw type of the positional option value from its usage string.
 */
export type InferPositionalType<TUsage extends PositionalUsageString> = TUsage extends
  | `<${infer TLabel}>`
  | `[${infer TLabel}]`
  ? TLabel extends `${string}...`
    ? string[]
    : string
  : never;

/**
 * Placeholder for any positional option configuration.
 */
export type AnyPositionalConfig = PositionalConfig<string, any, any, UnknownResult>;

/**
 * Create a positional option.
 */
export const createPositional = (
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
