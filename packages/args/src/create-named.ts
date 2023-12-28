import { type Named } from './types/named.js';
import { type NamedConfig } from './types/named-config.js';
import { type NamedInitialValue } from './types/named-initial-value.js';
import { type NamedKeys } from './types/named-keys.js';
import { type NamedNames } from './types/named-names.js';
import { type NamedParse } from './types/named-parse.js';
import { type NamedValue } from './types/named-value.js';

/**
 * Define a named option.
 *
 * ### Usage String Format
 *
 * - Names (eg. `--name`) and value placeholders (eg. `<value>`) may not
 * include whitespace or any of the following characters: `=,|.$<>[]`
 * - At least one name is required.
 * - Multiple names (aliases) can be separated by a comma (`,`) or
 * a pipe (`|`). Commas can have a single trailing space, and pipes can
 * have a space on either side.
 * - Only a single value placeholder is allowed per option, and it must
 * be at the end of the usage string.
 * - Value placeholders can be separated from names with a single space
 * (eg. `-n <value>`) or a single equals sign (eg. `-n=<value>`).
 *
 * #### Names
 *
 * Names are converted to `camelCase` when parsed. For example,
 * `--foo-bar` will be converted to `fooBar`. If multiple names
 * are given, then any of them can be used to access the named option
 * result.
 *
 * #### Valid Usage String Examples
 *
 * ```js
 * // Boolean (flag) with no value.
 * "-n, --name"
 * // Boolean (flag) with a pipe separator.
 * "-n | --name"
 * // Single required value.
 * "-n, --name <value>"
 * // Value separated by an equals sign.
 * "-n, --name=<value>"
 * // Variadic required value.
 * "-n, --name <values...>"
 * // Single optional value.
 * "-n, --name [value]"
 * // Variadic optional value.
 * "-n, --name [values...]"
 * ```
 *
 * #### Invalid Usage String Examples
 *
 * ```js
 * // INVALID: Multiple value placeholders.
 * "-n, --name <value> <value>"
 * // INVALID: Value placeholder not at the end.
 * "<value> -n, --name"
 * // INVALID: Space before comma.
 * "-n , --name <value>"
 * // INVALID: Too many spaces.
 * "-n,  --name  <value>"
 * ```
 *
 * ### Additional Configuration
 *
 * - `description` - A short description of the option, to be included in
 * the help output.
 * - `required` - When this is set, the option must be provided.
 * - `map` - When this is set, the option requires a dot-separated key
 * when used (eg. `--env.first`), and will produce a key/value record
 * unless a custom parse function is provided.
 * - `hidden` - When this is set, the option will not be included in the
 * help output.
 * - `conflicts` - Option names that conflict with this option.
 * - `implies` - Map of other option result values to set when this
 * option is set.
 * - `parse` - Validate the raw value and/or map it to a custom value.
 */
export const createNamed = <
  TUsage extends `-${string}`,
  TValue = NamedInitialValue<TUsage>,
  TRequired extends boolean = false,
  TMap extends boolean = false,
>(
  usage: TUsage,
  config: NamedConfig<TUsage, TValue, TRequired, TMap> = {},
): Named<TUsage, TValue, TRequired, TMap> => {
  const match = usage.match(
    /^(-[^\s=,|.$<>[\]]+(?:(?:, ?| ?\| ?)-[^\s=,|.$<>[\]]+)*)(?:[ =](<[^\s=,|.$<>[\]]+>|\[[^\s=,|.$<>[\]]+\]))?$/u,
  );

  if (!match) {
    throw new Error(`Invalid named option "${usage}"`);
  }

  const [, namesString = '', valueString = ''] = match;

  const names = namesString.split(/[,|]/u).map((name) => name.trim()) as readonly string[] as NamedNames<TUsage>;

  const keys = names.map((name) => {
    if (/^-*$/u.test(name)) {
      throw new Error(`Invalid named option name "${name}"`);
    }

    return name
      .replaceAll(/^-+|-+$/gu, '')
      .replaceAll(/-+(.)/gu, (_, char: string) => char.toUpperCase()) as NamedKeys<TUsage>[number];
  });

  const value = (
    valueString ? { variadic: /^[<\]]..|..[<\]]$/u.test(valueString), required: valueString.startsWith('<') } : false
  ) as NamedValue<TUsage>;

  const {
    description = '',
    required = false as TRequired,
    map = false as TMap,
    hidden = false,
    conflicts = [],
    parse = (<T>(v: T): T => v) as NamedParse<TUsage, TValue, TMap>,
  } = config;

  return { usage, names, keys, description, required, map, hidden, conflicts, value, parse };
};
