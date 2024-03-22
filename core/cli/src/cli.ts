/* eslint-disable unicorn/no-process-exit */
/* eslint-disable max-lines */
import { type CliAction, type CliOptionAction } from './action.js';
import {
  assertNoCommandsWithRequiredPositionalOption,
  assertNoDefaultCommandWithPositionalOption,
  assertNoPositionalOptionsWithDefaultCommand,
  assertNoRequiredPositionalOptionsWithCommand,
  assertNotConflictingTwoPositionalOptions,
  assertRequiredPositionalOptionsFirst,
  assertUniqueCommandName,
  assertUniqueOptionKey,
  assertUniqueOptionNames,
  assertValidName,
  assertVariadicPositionalOptionLast,
} from './assert.js';
import { optionHelpTag, optionVersionTag } from './constants.js';
import { CliUsageError } from './error.js';
import { type CliHelpFormatter, defaultCliHelpFormatter } from './help.js';
import {
  type AnyNamedConfig,
  createNamed,
  type InferNamedArgType,
  type InferNamedKey,
  type InferNamedResultType,
  type Named,
  type NamedConfig,
  type NamedUsageString,
} from './named.js';
import { parse } from './parse.js';
import {
  type AnyPositionalConfig,
  createPositional,
  type InferPositionalKey,
  type InferPositionalRequired,
  type InferPositionalType,
  type Positional,
  type PositionalConfig,
  type PositionalUsageString,
} from './positional.js';
import {
  type CliResult,
  type InferCliResultCommand,
  type InferCliResultOptions,
  type UnknownCliResult,
} from './result.js';
import { run } from './run.js';
import {
  type PickByType,
  type PickOptional,
  type PickRequired,
  type UnionProps,
  type UniqueTuple,
} from './types.js';
import { resolve } from './utils.js';

interface CliConfig<TName extends string = string> {
  readonly name: TName;
  readonly aliases?: readonly string[];
  readonly descriptions?: readonly string[];
  readonly trailers?: readonly string[];
  readonly version?: string;
  readonly options?: readonly (Named | Positional)[];
  readonly commands?: readonly UnknownCli[];
  readonly actions?: readonly CliAction[];
  readonly optionActions?: Readonly<Record<string, CliOptionAction[]>>;
  readonly optionDefaults?: Readonly<Record<string, () => unknown>>;
  readonly isExitOnErrorEnabled?: boolean;
  readonly isUnknownNamedOptionAllowed?: boolean;
  readonly isCommandOptional?: boolean;
  readonly isDefault?: boolean;
  readonly isHidden?: boolean;
  readonly helpFormatter?: CliHelpFormatter | null;
  readonly parent?: UnknownCli | null;
}

/**
 * An {@link InternalCli} instance with an unknown result type and name.
 * @internal
 */
export type UnknownCli = InternalCli<UnknownCliResult, string>;

/**
 * Infer the name of a {@link Cli} instance.
 */
export type InferCliName<TCli extends Cli<any, any>> = TCli extends Cli<any, infer TName> ? TName : never;

/**
 * Infer the result type of a {@link Cli} instance.
 */
export type InferCliResult<TCli extends Cli<any, any>> = TCli extends Cli<infer TResult, any> ? TResult : never;

/**
 * CLI definition.
 */
export class Cli<
  TResult extends UnknownCliResult = UnknownCliResult,
  TName extends string = string,
> {
  readonly #internal: InternalCli<TResult, TName>;

  private constructor(config: CliConfig<TName>) {
    this.#internal = new InternalCli(config);
  }

  /**
   * Change the CLI/command name.
   */
  name<TNewName extends string>(name: TNewName): Cli<TResult, TNewName>;
  /**
   * Get the CLI/command name.
   */
  name(): TName;
  name(name?: string): Cli<TResult, string> | string {
    if (name === undefined) {
      return this.#internal.name;
    }
    else {
      assertValidName(name);
      return new Cli({ ...this.#internal, name });
    }
  }

  /**
   * Add one or more aliases to the command.
   */
  alias<TAlias extends string>(...aliases: TAlias[]): Cli<TResult, TName> {
    aliases.forEach(assertValidName);

    return new Cli({
      ...this.#internal,
      aliases: [...this.#internal.aliases, ...aliases],
    });
  }

  /**
   * Add a paragraph to the start of the command help text.
   */
  description(description: string | null | undefined | false | 0 | 0n): Cli<TResult, TName> {
    return new Cli({
      ...this.#internal,
      descriptions: description
        ? [...this.#internal.descriptions, description]
        : this.#internal.descriptions,
    });
  }

  /**
   * Add a paragraph to the end of the command help text.
   */
  trailer(trailer: string | null | undefined | false | 0 | 0n): Cli<TResult, TName> {
    return new Cli({
      ...this.#internal,
      trailers: trailer
        ? [...this.#internal.trailers, trailer]
        : this.#internal.trailers,
    });
  }

  /**
   * Set the command version number.
   *
   * NOTE: This will also add default options for displaying the version
   * number (ie. `-v, --version`) if no explicit version has been set using
   * the `versionOption()` method, and no other options conflict with the `-v`
   * or `--version` option names.
   */
  version(version: string | null | undefined | false | 0 | 0n): Cli<TResult, TName> {
    let next: Cli<TResult, TName> = new Cli({
      ...this.#internal,
      version: version || this.#internal.version,
    });

    if (!this.#internal.options.some(({ meta }) => meta === optionVersionTag)) {
      next = next.optionVersion();
    }

    return next;
  }

  /**
   * Define a named option.
   *
   * - Must begin with a hyphen followed by a name (eg. `-a` or `--abc`).
   *   - Names cannot contain whitespace or the following reserved characters: `=,|.<>[]`
   * - Aliases can be separating a comma or pipe (eg. `-a, --abc` or `-a | --abc`).
   * - The last alias may be followed by a "positional" value placeholder
   *   (eg. `--option <value>` or `--option=<value>`).
   * - The option key defaults to the last alias converted to camel case (eg. `-f, --foo-bar` becomes `fooBar`).
   */
  option<
    TUsage extends NamedUsageString,
    TKey extends string | null = InferNamedKey<TUsage>,
    TRequired extends boolean = false,
    TMapped extends boolean = false,
    TValue = TMapped extends true ? Record<string, InferNamedArgType<TUsage>> : InferNamedArgType<TUsage>,
    TParsedValue = TMapped extends true ? Record<string, InferNamedResultType<TUsage>> : InferNamedResultType<TUsage>,
  >(
    usage: TUsage,
    config?: string | NamedConfig<TKey, TValue, TParsedValue, TRequired, TMapped, TResult>,
  ): Cli<
    TKey extends string
      ? CliResult<
        UnionProps<
          InferCliResultOptions<TResult>,
          Record<TKey, TParsedValue | (TRequired extends true ? never : undefined)>
        >,
        InferCliResultCommand<TResult>
      >
      : TResult,
    TName
  >;
  /**
   * Define a positional option.
   *
   * - Must be wrapped in angle brackets (`<value>`) for required or square brackets (`[value]`) for non-required.
   * - Names cannot contain whitespace or the following reserved characters: `=,|.<>[]`
   * - Names may be followed by a trailing ellipsis to indicate a variadic option (eg. `<value...>` or `[value...]`).
   * - The option key defaults to the name (with ellipses removed) converted to camel case
   *   (eg. `<foo-bar...>` becomes `fooBar`).
   */
  option<
    TUsage extends PositionalUsageString,
    TKey extends string | null = InferPositionalKey<TUsage>,
    TRequired extends boolean = InferPositionalRequired<TUsage>,
    TValue = InferPositionalType<TUsage>,
    TParsedValue = InferPositionalType<TUsage>,
  >(
    usage: TUsage,
    config?: string | PositionalConfig<TKey, TValue, TParsedValue, TResult>,
  ): Cli<
    TKey extends string
      ? CliResult<
        UnionProps<
          InferCliResultOptions<TResult>,
          Record<TKey, TParsedValue | (TRequired extends true ? never : undefined)>
        >,
        InferCliResultCommand<TResult>
      >
      : TResult,
    TName
  >;
  option(
    usage: string,
    config?:
      | string
      | NamedConfig<string | null, any, any, boolean, boolean, TResult>
      | PositionalConfig<string | null, any, any, TResult>,
  ): Cli<UnknownCliResult, TName> {
    if (usage.startsWith('-')) {
      const option = createNamed(
        usage,
        config as AnyNamedConfig | string | undefined,
      );

      assertUniqueOptionNames(this.#internal, option);
      assertUniqueOptionKey(this.#internal, option);

      return new Cli({
        ...this.#internal,
        options: [...this.#internal.options, option],
      });
    }

    if (usage.startsWith('<') || usage.startsWith('[')) {
      const option = createPositional(
        usage,
        config as AnyPositionalConfig | string | undefined,
      );

      assertUniqueOptionKey(this.#internal, option);
      assertVariadicPositionalOptionLast(this.#internal, option);
      assertRequiredPositionalOptionsFirst(this.#internal, option);
      assertNoCommandsWithRequiredPositionalOption(this.#internal, option);
      assertNoDefaultCommandWithPositionalOption(this.#internal);

      return new Cli({
        ...this.#internal,
        options: [...this.#internal.options, option],
      });
    }

    throw new Error(`invalid option "${usage}"`);
  }

  /**
   * Set an option which will print the help text for the command and exit
   * the process. Set to `null` to remove a previously defined help option.
   *
   * NOTE: Setting this option replaces the previously defined help option.
   */
  optionHelp(
    usage?: NamedUsageString | null,
    config: string | Omit<AnyNamedConfig, 'key' | 'required' | 'mapped' | 'parse' | 'meta'> = {},
  ): Cli<TResult, TName> {
    const options = this.#internal.options.filter(({ meta }) => {
      return meta !== optionHelpTag;
    });

    if (usage === undefined) {
      usage = (['-h', '--help']
        .filter((name) => {
          return !options.some((option) => {
            return option.type === 'named' && option.names.includes(name);
          });
        })
        .join(', ') || null) as NamedUsageString | null;
    }

    if (usage) {
      if (typeof config === 'string') {
        config = { description: config };
      }

      const option = createNamed(usage, {
        ...config,
        meta: optionHelpTag,
        description: config.description ?? 'print this help text',
        parse: (value, prev, result) => {
          result.printHelp();
          // eslint-disable-next-line unicorn/no-process-exit
          process.exit();
        },
      });

      if (option.value) {
        throw new Error(`help option cannot have a value`);
      }

      options.push(option);
    }

    return new Cli({ ...this.#internal, options });
  }

  /**
   * Set an option which will print the command version number and exit the
   * process. Set to `null` to remove a previously defined version option.
   *
   * NOTE: Setting this option replaces the previously defined version option.
   */
  optionVersion(
    usage?: NamedUsageString | null,
    config: string | Omit<AnyNamedConfig, 'key' | 'required' | 'mapped' | 'parse' | 'meta'> = {},
  ): Cli<TResult, TName> {
    const options = this.#internal.options.filter(({ meta }) => meta !== optionVersionTag);

    if (usage === undefined) {
      usage = (['-v', '--version']
        .filter((name) => {
          return !options.some((option) => {
            return option.type === 'named' && option.names.includes(name);
          });
        })
        .join(', ') || null) as NamedUsageString | null;
    }

    if (usage != null) {
      if (typeof config === 'string') {
        config = { description: config };
      }

      const option = createNamed(usage, {
        ...config,
        meta: optionVersionTag,
        description: config.description ?? 'print the version number',
        parse: () => {
          console.log(this.#internal.version);
          // eslint-disable-next-line unicorn/no-process-exit
          process.exit();
        },
      });

      if (option?.value) {
        throw new Error(`version option cannot have a value`);
      }

      options.push(option);
    }

    return new Cli({ ...this.#internal, options });
  }

  /**
   * Treat two or more boolean options as negating each other. When one of the
   * options is set, all others will be set to `false`.
   *
   * If any of the options are required, setting a negating option will fulfil
   * the requirement.
   *
   * NOTE: All options must be boolean typed.
   */
  optionNegation<
    TKey0 extends keyof PickByType<InferCliResultOptions<TResult>, boolean>,
    TKey1 extends Exclude<keyof PickByType<InferCliResultOptions<TResult>, boolean>, TKey0>,
    TKeyN extends Exclude<keyof PickByType<InferCliResultOptions<TResult>, boolean>, TKey0 | TKey1>[],
  >(...keys: [key0: TKey0, key1: TKey1, ...keyN: UniqueTuple<TKeyN>]): Cli<
    CliResult<
      UnionProps<
        Omit<InferCliResultOptions<TResult>, TKey0 | TKey1 | TKeyN[number]>,
        Record<
          TKey0 | TKey1 | TKeyN[number],
          | boolean
          | (keyof PickRequired<InferCliResultOptions<TResult>> extends never
            ? undefined
            : never)
        >
      >,
      InferCliResultCommand<TResult>
    >,
    TName
  > {
    return keys.reduce<Cli<any, TName>>((current, key) => {
      return current.optionAction(key as string, ({ result }) => {
        keys.forEach((otherKey) => {
          if (otherKey !== key) {
            result.options[otherKey as string] = false;
          }
        });
      });
    }, this);
  }

  /**
   * Treat two or more options as conflicting with each other. If one of the
   * option is parsed, all others will fail when parsed.
   *
   * NOTE: All options must be non-required, and only one of them can be
   * positional.
   */
  optionConflict<
    TKey0 extends keyof PickOptional<InferCliResultOptions<TResult>>,
    TKey1 extends Exclude<keyof PickOptional<InferCliResultOptions<TResult>>, TKey0>,
    TKeyN extends Exclude<keyof PickOptional<InferCliResultOptions<TResult>>, TKey0 | TKey1>[],
  >(...keys: [key0: TKey0, key1: TKey1, ...keyN: TKeyN]): Cli<TResult, TName> {
    const options = keys.map((key) => {
      return this.#internal.options.find((option) => option.key === key)!;
    });

    assertNotConflictingTwoPositionalOptions(options);

    return keys.reduce<Cli<TResult, TName>>((current, key) => {
      const option = options.find((value) => value.key === key)!;

      return current.optionAction(key, ({ result }) => {
        options.forEach((otherOption) => {
          if (key !== otherOption.key && otherOption.key != null && result.parsed.has(otherOption.key)) {
            throw new Error(`option "${option.usage}" conflicts with "${otherOption.usage}"`);
          }
        });
      });
    }, this);
  }

  /**
   * Define an action to run each time a specific option is parsed.
   * Multiple actions will be run in the order they are defined.
   */
  optionAction<TKey extends keyof InferCliResultOptions<TResult>>(
    key: TKey,
    callback: CliOptionAction<TResult, TKey>,
  ): Cli<TResult, TName> {
    return new Cli({
      ...this.#internal,
      optionActions: {
        ...this.#internal.optionActions,
        [key]: [
          ...(this.#internal.optionActions.key ?? []),
          callback as CliOptionAction,
        ],
      },
    });
  }

  /**
   * Provide a default value for a non-required option.
   */
  optionDefault<TKey extends keyof PickOptional<InferCliResultOptions<TResult>>>(
    key: TKey,
    factory:
      | Extract<InferCliResultOptions<TResult>[TKey], null | boolean | number | bigint | string>
      | (() =>
      | Exclude<InferCliResultOptions<TResult>[TKey], undefined>
      | Promise<Exclude<InferCliResultOptions<TResult>[TKey], undefined>>),
  ): Cli<
      CliResult<
        UnionProps<
          Omit<InferCliResultOptions<TResult>, TKey>,
          Record<TKey, Exclude<InferCliResultOptions<TResult>[TKey], undefined>>
        >,
        InferCliResultCommand<TResult>
      >,
      TName
    > {
    return new Cli({
      ...this.#internal,
      optionDefaults: {
        ...this.#internal.optionDefaults,
        [key]: typeof factory === 'function' ? factory : () => factory,
      },
    });
  }

  /**
   * Add a command.
   *
   * NOTE: Commands must match _BEFORE_ any positional options are parsed.
   * This means that commands are incompatible with required positional
   * options, and no non-required positional options will be parsed by the
   * current command if a command is matched.
   */
  command<TCommandName extends string, TCommandResult extends UnknownCliResult>(
    command: Cli<TCommandResult, TCommandName>,
  ): Cli<
      CliResult<
        InferCliResultOptions<TResult>,
        UnionProps<InferCliResultCommand<TResult>, Record<TCommandName, TCommandResult | undefined>>
      >,
      TName
    > {
    assertUniqueCommandName(this.#internal, command.#internal);
    assertNoRequiredPositionalOptionsWithCommand(this.#internal);
    assertNoPositionalOptionsWithDefaultCommand(
      this.#internal,
      command.#internal,
    );

    return new Cli({
      ...this.#internal,
      commands: [
        ...this.#internal.commands,
        new InternalCli({
          ...command.#internal,
          aliases: command.#internal.aliases.filter((alias) => {
            return !this.#internal.commands.some((other) => {
              return other.name === alias || other.aliases.includes(alias);
            });
          }),
          parent: this.#internal,
        }),
      ],
    });
  }

  /**
   * Define an action to run after all command line arguments have been
   * parsed. Multiple actions will be run in the order they are defined.
   *
   * A "cleanup" callback can be returned which will be run after all command
   * actions. Cleanup callbacks run in the reverse order they are defined.
   */
  action(callback: CliAction<TResult>): Cli<TResult, TName> {
    return new Cli({
      ...this.#internal,
      actions: [...this.#internal.actions, callback as CliAction],
    });
  }

  /**
   * Exit the process with a non-zero status code if an error occurs while
   * parsing or executing an action.
   *
   * NOTE: If set to `true`, help text is printed for parsing errors, and the
   * stringified error is always printed.
   */
  setExitOnError(value = true): Cli<TResult, TName> {
    return new Cli({ ...this.#internal, isExitOnErrorEnabled: value });
  }

  /**
   * Allow unknown named options to be treated as positional options.
   *
   * NOTE: An unknown named option may still fail if it does not match a
   * defined positional option. To avoid this, define a variadic
   * positional option (eg. `<extra...>`) to capture any unknown named
   * options.
   */
  setUnknownNamedOptionAllowed(value = true): Cli<TResult, TName> {
    return new Cli({ ...this.#internal, isUnknownNamedOptionAllowed: value });
  }

  /**
   * Do not fail parsing if no command is matched.
   *
   * NOTE: This has no effect if no commands are defined or if there is a
   * default command.
   */
  setCommandOptional(value = true): Cli<TResult, TName> {
    return new Cli({ ...this.#internal, isCommandOptional: value });
  }

  /**
   * Use this command when no other commands are matched.
   */
  setDefault(value = true): Cli<TResult, TName> {
    return new Cli({ ...this.#internal, isDefault: value });
  }

  /**
   * Hide this command in parent command help text.
   */
  setHidden(value = true): Cli<TResult, TName> {
    return new Cli({ ...this.#internal, isHidden: value });
  }

  /**
   * Set a custom help text formatter.
   *
   * NOTE: Commands inherit the help text formatter of their parent unless a
   * custom formatter is (or was) explicitly set on the command.
   */
  setHelpFormatter(value: CliHelpFormatter | null): Cli<TResult, TName> {
    return new Cli({ ...this.#internal, helpFormatter: value });
  }

  /**
   * Return the help text for this command.
   */
  getHelpText(error: unknown = null): string {
    return this.#internal.getHelpText(error);
  }

  /**
   * Print the help text for this command.
   *
   * NOTE: Output is written to STDOUT if `error` is falsy, otherwise it
   * is written to STDERR.
   */
  printHelp(error?: unknown): void {
    return this.#internal.printHelp(error);
  }

  /**
   * Parse command line arguments and run command actions.
   *
   * If `args` are not explicitly provided, `process.argv.slice(2)` is
   * used. Any extra leading arguments must be removed when explicitly
   * providing `args`.
   */
  async parse(args: readonly string[] = process.argv.slice(2)): Promise<TResult> {
    return await this.#internal.parse(args);
  }

  /**
   * Define a new command line interface.
   */
  static create<TName extends string>(name: TName): Cli<CliResult<{}, {}>, TName> {
    assertValidName(name);
    return new Cli({ name });
  }
}

class InternalCli<TResult extends UnknownCliResult, TName extends string> implements Required<CliConfig<TName>> {
  readonly name: TName;
  readonly aliases: readonly string[];
  readonly descriptions: readonly string[];
  readonly trailers: readonly string[];
  readonly version: string;
  readonly options: readonly (Named | Positional)[];
  readonly commands: readonly UnknownCli[];
  readonly actions: readonly CliAction[];
  readonly optionActions: Readonly<Record<string, CliOptionAction[]>>;
  readonly optionDefaults: Readonly<Record<string, () => unknown>>;
  readonly isExitOnErrorEnabled: boolean;
  readonly isUnknownNamedOptionAllowed: boolean;
  readonly isCommandOptional: boolean;
  readonly isDefault: boolean;
  readonly isHidden: boolean;
  readonly helpFormatter: CliHelpFormatter | null;
  readonly parent: UnknownCli | null;

  constructor(config: CliConfig<TName>) {
    this.name = config.name;
    this.aliases = config.aliases ?? [];
    this.descriptions = config.descriptions ?? [];
    this.trailers = config.trailers ?? [];
    this.version = config.version ?? '0.0.0';
    this.options = config.options ?? [];
    this.commands = config.commands ?? [];
    this.actions = config.actions ?? [];
    this.optionActions = config.optionActions ?? {};
    this.optionDefaults = config.optionDefaults ?? {};
    this.isExitOnErrorEnabled = config.isExitOnErrorEnabled ?? false;
    this.isUnknownNamedOptionAllowed = config.isUnknownNamedOptionAllowed ?? false;
    this.isCommandOptional = config.isCommandOptional ?? false;
    this.isDefault = config.isDefault ?? false;
    this.isHidden = config.isHidden ?? false;
    this.helpFormatter = config.helpFormatter ?? null;
    this.parent = config.parent ?? null;
  }

  getHelpText(error: unknown = null): string {
    const formatter = resolve(
      this,
      (current: UnknownCli) => current.parent,
      (current: UnknownCli) => current.helpFormatter,
      defaultCliHelpFormatter,
    );

    return formatter.format(this, error);
  }

  printHelp(error?: unknown): void {
    console[error ? 'error' : 'log'](this.getHelpText(error));
  }

  async parse(args: readonly string[] = process.argv.slice(2)): Promise<TResult> {
    let result: TResult;

    try {
      result = (await parse(this, args)) as TResult;
      await run(this, result);
    }
    catch (error) {
      if (!this.isExitOnErrorEnabled) throw error;

      if (error instanceof CliUsageError && error.context) {
        error.context.printHelp(error);
      }
      else {
        console.error(String(error));
      }

      process.exitCode ||= 1;
      process.exit();
    }

    return result;
  }
}
