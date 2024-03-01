import { Ansi, type AnsiColor } from './ansi.js';
import { isLogLevel, LogLevel } from './level.js';
import { LogStream } from './stream.js';

interface LogOptions {
  readonly prefix?: string;
  readonly prefixColor?: AnsiColor | null;
}

interface LogPrintOptions {
  readonly once?: boolean;
  readonly prefix?: boolean;
  readonly style?: 'dim' | 'bold';
  readonly color?: AnsiColor | null;
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

export class Log {
  #prefix = '';
  #prefixColor: AnsiColor | null = null;
  #prefixFormatted = '';

  readonly stdout: LogStream = new LogStream();
  readonly stderr: LogStream = new LogStream();

  get prefix(): string {
    return this.#prefix;
  }
  set prefix(value: string) {
    this.#prefix = Ansi.strip(value);
    this.#updatePrefix();
  }

  get prefixColor(): AnsiColor | null {
    return this.#prefixColor;
  }
  set prefixColor(value: AnsiColor | null) {
    this.#prefixColor = value;
    this.#updatePrefix();
  }

  constructor(options: LogOptions = {}) {
    const { prefix = '', prefixColor } = options;

    this.stdout.on('data', this.#onStreamData.bind(this, 'stdout'));
    this.stderr.on('data', this.#onStreamData.bind(this, 'stderr'));
    this.prefix = Ansi.strip(prefix);
    this.prefixColor = prefixColor ?? null;

    this.silly = createLogFunction(
      this._print.bind(this, 'stderr', LogLevel.silly),
      { style: 'dim' },
    );

    this.verbose = createLogFunction(
      this._print.bind(this, 'stderr', LogLevel.verbose),
      { style: 'dim' },
    );

    this.info = createLogFunction(
      this._print.bind(this, 'stdout', LogLevel.info),
    );

    this.notice = createLogFunction(
      this._print.bind(this, 'stderr', LogLevel.notice),
    );

    this.warn = createLogFunction(
      this._print.bind(this, 'stderr', LogLevel.warn),
      { color: 'yellow' },
    );

    this.error = createLogFunction(
      this._print.bind(this, 'stderr', LogLevel.error),
      { color: 'red' },
    );

    this.print = createLogFunction(
      this._print.bind(this, 'stdout', LogLevel.silent),
    );
  }

  /**
   * Create a new instance of `Log` which inherits options from the current
   * instance.
   */
  readonly clone = (overrides: LogOptions = {}): Log => {
    const { prefix = this.prefix, prefixColor = this.prefixColor } = overrides;

    return new Log({ prefix, prefixColor });
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
      style,
    } = options;

    if (isLogLevel(level)) {
      const message = getMessageString(value);
      const text = `${prefix ? this.#prefixFormatted : ''}${color ? Ansi.color[color] : ''}${style ? Ansi[style] : ''}${message}${
        Ansi.reset
      }\n`;

      if (!once || isFirstOccurrence(text)) {
        process[toActual].write(text);
      }
    }
  };

  readonly #updatePrefix = (): void => {
    this.#prefixFormatted = this.prefix
      ? `${Ansi.bold}${this.prefixColor ? Ansi.color[this.prefixColor] : ''}${this.prefix}:${Ansi.reset} `
      : '';
  };

  readonly #onStreamData = (to: 'stdout' | 'stderr', line: string): void => {
    if (line) this._print(to, LogLevel.silent, line);
  };
}

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

const createLogFunction = (
  print: (message: unknown, options?: LogPrintOptions) => void,
  defaultOptions?: Omit<LogPrintOptions, 'to'>,
): LogFunction => {
  return ((
    ...args:
      | [template: TemplateStringsArray, ...values: unknown[]]
      | [options: LogPrintOptions & { message: unknown }]
      | [options: LogPrintOptions]
      | [message: string | Error]
  ):
    | ((template: TemplateStringsArray, ...values: unknown[]) => void)
    | void => {
    if (args[0] instanceof Array) {
      const [template, ...values] = args;
      print(String.raw(template, ...values), defaultOptions);
    } else if (typeof args[0] === 'string' || args[0] instanceof Error) {
      const [message] = args;
      print(message, defaultOptions);
    } else {
      const [options] = args;

      if ('message' in options) {
        const { message, ...rest } = options;
        print(message, { ...defaultOptions, ...rest });
      } else {
        return (template: TemplateStringsArray, ...values: unknown[]): void => {
          print(String.raw(template, ...values), {
            ...defaultOptions,
            ...options,
          });
        };
      }
    }
  }) as LogFunction;
};

const isFirstOccurrence = (message: string): boolean => {
  if (occurrences.has(message)) return false;
  occurrences.add(message);
  return true;
};

const occurrences = new Set<string>();

export const log = new Log();
