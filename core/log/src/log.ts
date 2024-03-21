import { Ansi, type AnsiColor } from './ansi.js';
import { isLogLevel, LogLevel } from './level.js';
import { LogStream } from './stream.js';

interface LogOptions {
  readonly prefix?: string;
  readonly prefixStyle?: string;
}

interface LogPrintOptions {
  readonly once?: boolean;
  readonly prefix?: boolean;
  readonly modifier?: 'dim' | 'bold';
  readonly color?: Exclude<AnsiColor, 'black' | 'white'> | null;
  readonly to?: 'stdout' | 'stderr';
}

type LogFunction = {
  (template: TemplateStringsArray, ...values: unknown[]): void;
  (options: LogPrintOptions & { message: unknown }): void;
  (message: string | Error): void;
  (
    options: LogPrintOptions,
  ): (template: TemplateStringsArray, ...values: unknown[]) => void;
};

/**
 * A simple logger with global level, prefixing, and streams.
 */
export class Log {
  #prefix = '';
  #prefixStyle = '';
  #prefixStyled = '';

  /**
   * The standard output stream which cleans and prefixes streamed lines.
   */
  readonly stdout: LogStream = new LogStream();

  /**
   * The standard error stream which cleans and prefixes streamed lines.
   */
  readonly stderr: LogStream = new LogStream();

  /**
   * Get the unstyled prefix string.
   */
  get prefix(): string {
    return this.#prefix;
  }

  /**
   * Set the unstyled prefix string. This will also update the styled prefix.
   */
  set prefix(value: string) {
    this.#prefix = Ansi.strip(value);
    this.#updatePrefix();
  }

  /**
   * Get the prefix style string. This is a prefix for the prefix which is
   * allowed to contain ANSI color and style codes.
   */
  get prefixStyle(): string {
    return this.#prefixStyle;
  }

  /**
   * Set the prefix style string. This will also update the styled prefix.
   * This is a prefix for the prefix which is allowed to contain ANSI color
   * and style codes.
   */
  set prefixStyle(value: string) {
    this.#prefixStyle = value;
    this.#updatePrefix();
  }

  /**
   * Create a new log instance with the given options.
   */
  constructor(options: LogOptions = {}) {
    const { prefix = '', prefixStyle = '' } = options;

    this.stdout.on('data', this.#onStreamData.bind(this, 'stdout'));
    this.stderr.on('data', this.#onStreamData.bind(this, 'stderr'));
    this.prefix = Ansi.strip(prefix);
    this.prefixStyle = prefixStyle ?? null;

    this.silly = createLogFunction(
      this._print.bind(this, 'stderr', LogLevel.silly),
      { modifier: 'dim' },
    );

    this.verbose = createLogFunction(
      this._print.bind(this, 'stderr', LogLevel.verbose),
      { modifier: 'dim' },
    );

    this.info = createLogFunction(this._print.bind(this, 'stdout', LogLevel.info));

    this.notice = createLogFunction(this._print.bind(this, 'stderr', LogLevel.notice));

    this.warn = createLogFunction(
      this._print.bind(this, 'stderr', LogLevel.warn),
      { color: 'yellow' },
    );

    this.error = createLogFunction(
      this._print.bind(this, 'stderr', LogLevel.error),
      { color: 'red' },
    );

    this.print = createLogFunction(this._print.bind(this, 'stdout', LogLevel.silent));
  }

  /**
   * Create a new log instance which inherits options from the current
   * instance.
   */
  readonly clone = (overrides: LogOptions = {}): Log => {
    const { prefix = this.prefix, prefixStyle = this.prefixStyle } = overrides;

    return new Log({ prefix, prefixStyle });
  };

  /**
   * Create a new log instance with a suffix appended to the prefix. If there
   * is no prefix, then the suffix becomes the entire prefix. If there is
   * already a prefix, then the suffix is appended as a subscript
   * (ie. `prefix[suffix]`). Blank, boolean, or nullish suffixes are ignored.
   */
  readonly sub = (suffix: number | string | boolean | null | undefined): Log => {
    return this.clone({
      prefix:
        suffix === '' || typeof suffix === 'boolean' || suffix == null
          ? undefined
          : this.prefix
            ? `${this.prefix}[${suffix}]`
            : String(suffix),
    });
  };

  /**
   * Print a dimmed message to stderr.
   */
  readonly silly: LogFunction;
  /**
   * Alias for `silly`.
   */
  readonly trace: LogFunction = (...args: [any]): any => {
    return this.silly(...args);
  };

  /**
   * Print a dimmed message to stderr.
   */
  readonly verbose: LogFunction;
  /**
   * Alias for `verbose`.
   */
  readonly debug: LogFunction = (...args: [any]): any => {
    return this.verbose(...args);
  };

  /**
   * Print an uncolored message to stdout.
   */
  readonly info: LogFunction;

  /**
   * Print an uncolored message to stderr.
   */
  readonly notice: LogFunction;

  /**
   * Print a yellow message to stderr.
   */
  readonly warn: LogFunction;

  /**
   * Print a red message to stderr.
   */
  readonly error: LogFunction;

  /**
   * Print a message to stdout, regardless of log level.
   */
  readonly print: LogFunction;

  /**
   * Call the flush methods on `this.stdout` and `this.stderr`.
   */
  readonly flush = (): void => {
    this.stdout.flush();
    this.stderr.flush();
  };

  /**
   * _This method is intended for internal use._
   *
   * All logged and streamed data is passed through this method.
   */
  protected readonly _print = (
    to: 'stdout' | 'stderr',
    level: LogLevel,
    value: unknown,
    options: LogPrintOptions = {},
  ): void => {
    if (value == null) return;

    const {
      to: toActual = to,
      once = false,
      prefix = true,
      color,
      modifier,
    } = options;

    if (isLogLevel(level)) {
      const message = getMessageString(value);
      const prefixString = prefix ? this.#prefixStyled : '';
      const colorString = color ? Ansi.color[color] : '';
      const styleString = modifier ? Ansi[modifier] : '';
      const text = `${Ansi.reset}${prefixString}${colorString}${styleString}${message}${Ansi.reset}\n`;

      if (!once || isFirstOccurrence(text)) {
        process[toActual].write(text);
      }
    }
  };

  readonly #updatePrefix = (): void => {
    this.#prefixStyled = this.prefix
      ? `${this.#prefixStyle}${this.prefix}:${Ansi.reset} `
      : '';
  };

  readonly #onStreamData = (to: 'stdout' | 'stderr', line: string): void => {
    if (line) this._print(to, LogLevel.silent, line);
  };
}

const createLogFunction = (
  print: (message: unknown, options?: LogPrintOptions) => void,
  defaultOptions?: Omit<LogPrintOptions, 'to'>,
): LogFunction => {
  return ((...args:
    | [template: TemplateStringsArray, ...values: unknown[]]
    | [options: LogPrintOptions & { message: unknown }]
    | [options: LogPrintOptions]
    | [message: string | Error]):
    | ((template: TemplateStringsArray, ...values: unknown[]) => void)
    | void => {
    if (args[0] instanceof Array) {
      const [template, ...values] = args;
      print(getTemplateString(template, values), defaultOptions);
    }
    else if (typeof args[0] === 'string' || args[0] instanceof Error) {
      const [message] = args;
      print(message, defaultOptions);
    }
    else {
      const [options] = args;

      if ('message' in options) {
        const { message, ...rest } = options;
        print(message, { ...defaultOptions, ...rest });
      }
      else {
        return (template: TemplateStringsArray, ...values: unknown[]): void => {
          print(getTemplateString(template, values), {
            ...defaultOptions,
            ...options,
          });
        };
      }
    }
  }) as LogFunction;
};

const getTemplateString = (
  template: TemplateStringsArray,
  values: unknown[],
): string => {
  return template
    .slice(1)
    .reduce((acc, part, i) => {
      return acc + String(values[i]) + part;
    }, template[0]!);
};

const getMessageString = (value: unknown): string => {
  if (value instanceof Error) {
    if (process.env.DEBUG) {
      return value.stack ?? String(value);
    }

    if (value.name === 'Error' || value.name === 'AssertionError') {
      return value.message;
    }
  }

  return String(value);
};

const isFirstOccurrence = (message: string): boolean => {
  if (occurrences.has(message)) return false;
  occurrences.add(message);
  return true;
};

const occurrences = new Set<string>();

/**
 * The default log instance.
 */
export const log = new Log();
