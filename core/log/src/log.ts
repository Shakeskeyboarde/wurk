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

const occurrences = new Set<string>();

const isFirstOccurrence = (message: string): boolean => {
  if (occurrences.has(message)) return false;
  occurrences.add(message);
  return true;
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
  readonly silly = (value?: unknown, options?: LogPrintOptions): void => {
    this._print(options?.to ?? 'stderr', LogLevel.silly, value, { style: 'dim', ...options });
  };
  /**
   * Alias for `silly`.
   */
  readonly trace = this.silly;

  /**
   * Print a dimmed message to stderr.
   */
  readonly verbose = (value?: unknown, options?: LogPrintOptions): void => {
    this._print(options?.to ?? 'stderr', LogLevel.verbose, value, { style: 'dim', ...options });
  };
  /**
   * Alias for `verbose`.
   */
  readonly debug = this.verbose;

  /**
   * Print an uncolored message to stdout.
   */
  readonly info = (value?: unknown, options?: LogPrintOptions): void => {
    this._print(options?.to ?? 'stdout', LogLevel.info, value, options);
  };

  /**
   * Print an uncolored message to stderr.
   */
  readonly notice = (value?: unknown, options?: LogPrintOptions): void => {
    this._print(options?.to ?? 'stderr', LogLevel.notice, value, options);
  };

  /**
   * Print a yellow message to stderr.
   */
  readonly warn = (value?: unknown, options?: LogPrintOptions): void => {
    this._print(options?.to ?? 'stderr', LogLevel.warn, value, { color: 'yellow', ...options });
  };

  /**
   * Print a red message to stderr.
   */
  readonly error = (value?: unknown, options?: LogPrintOptions): void => {
    this._print(options?.to ?? 'stderr', LogLevel.warn, value, { color: 'red', ...options });
  };

  /**
   * Print a message to stdout, regardless of log level.
   */
  readonly print = (value?: unknown, options?: LogPrintOptions): void => {
    this._print(options?.to ?? 'stdout', LogLevel.silent, value, options);
  };

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
    { once = false, prefix = true, color, style }: Omit<LogPrintOptions, 'to'> = {},
  ): void => {
    if (isLogLevel(level)) {
      const message =
        value == null ? '' : value instanceof Error && process.env.DEBUG ? value.stack ?? String(value) : String(value);
      const text = `${prefix ? this.#prefixFormatted : ''}${color ? Ansi.color[color] : ''}${style ? Ansi[style] : ''}${message}${
        Ansi.reset
      }\n`;

      if (!once || isFirstOccurrence(text)) {
        process[to].write(text);
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

export const log = new Log();
