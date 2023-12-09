import assert from 'node:assert';
import { type Writable } from 'node:stream';

import { Ansi, type AnsiColor } from './ansi.js';
import { LogStream } from './log-stream.js';

export interface LogOptions {
  readonly prefixText?: string;
  readonly prefixColor?: AnsiColor | null;
}

export interface LogPrintOptions {
  readonly once?: boolean;
  readonly prefix?: boolean;
  readonly style?: 'dim' | 'bold';
  readonly color?: AnsiColor | null;
}

export enum LogLevel {
  silent = 0,
  error = 10,
  warn = 20,
  notice = 30,
  info = 40,
  verbose = 50,
  silly = 60,
}

export type LogLevelString = keyof typeof LogLevel;

const LOG_LEVEL_DEFAULT: LogLevelString =
  process.env.WERK_LOG_LEVEL && process.env.WERK_LOG_LEVEL in LogLevel
    ? (process.env.WERK_LOG_LEVEL as LogLevelString)
    : 'warn';

const occurrences = new Set<string>();

const getErrorText = (error: Error): string => {
  return process.env.DEBUG ? error.stack ?? String(error) : error.message;
};

const getMessage = (value: unknown): string => {
  return value == null ? '' : value instanceof Error ? getErrorText(value) : String(value);
};

export const parseLogLevel = (value: string): LogLevelString => {
  switch (value) {
    case 'trace':
      value = 'silly' satisfies LogLevelString;
      break;
    case 'debug':
      value = 'verbose' satisfies LogLevelString;
      break;
  }

  assert(value in LogLevel, new Error(`Log level must be one of: ${Object.keys(LogLevel).join(', ')}.`));
  return value as LogLevelString;
};

export class Log {
  static #level: { readonly name: LogLevelString; readonly value: number } = {
    name: LOG_LEVEL_DEFAULT,
    value: LogLevel[LOG_LEVEL_DEFAULT],
  };

  static get level(): { readonly name: LogLevelString; readonly value: number } {
    return Log.#level;
  }

  static setLevel(level: LogLevelString): void {
    process.env.WERK_LOG_LEVEL = level;
    Log.#level = { name: level, value: LogLevel[level] };
  }

  readonly stdout: LogStream = new LogStream();
  readonly stderr: LogStream = new LogStream();
  readonly prefixText: string;
  readonly prefixColor: AnsiColor | null | undefined;
  readonly prefix: string;

  constructor({ prefixText: prefix = '', prefixColor }: LogOptions = {}) {
    this.stdout.on('data', this.#onStreamData.bind(this, process.stdout));
    this.stderr.on('data', this.#onStreamData.bind(this, process.stderr));
    this.prefixText = Ansi.strip(prefix);
    this.prefixColor = prefixColor;
    this.prefix = this.prefixText
      ? `${Ansi.bold}${this.prefixColor ? Ansi.color[this.prefixColor] : ''}${this.prefixText}:${Ansi.reset} `
      : '';
  }

  get level(): { readonly name: LogLevelString; readonly value: number } {
    return Log.#level;
  }

  readonly isLevel = (level: LogLevelString | number): boolean => {
    const value = typeof level === 'number' ? level : LogLevel[level];
    return value <= this.level.value;
  };

  /**
   * Print a dimmed message to stderr.
   */
  readonly silly = (value?: unknown, options?: LogPrintOptions): void => {
    this._print(process.stderr, LogLevel.silly, value, { style: 'dim', ...options });
  };
  /**
   * Alias for `silly`.
   */
  readonly trace = this.silly;

  /**
   * Print a dimmed message to stderr.
   */
  readonly verbose = (value?: unknown, options?: LogPrintOptions): void => {
    this._print(process.stderr, LogLevel.verbose, value, { style: 'dim', ...options });
  };
  /**
   * Alias for `verbose`.
   */
  readonly debug = this.verbose;

  /**
   * Print an uncolored message to stdout.
   */
  readonly info = (value?: unknown, options?: LogPrintOptions): void => {
    this._print(process.stdout, LogLevel.info, value, options);
  };

  /**
   * Print an uncolored message to stderr.
   */
  readonly notice = (value?: unknown, options?: LogPrintOptions): void => {
    this._print(process.stderr, LogLevel.notice, value, options);
  };

  /**
   * Print a yellow message to stderr.
   */
  readonly warn = (value?: unknown, options?: LogPrintOptions): void => {
    this._print(process.stderr, LogLevel.warn, value, { color: 'yellow', ...options });
  };

  /**
   * Print a red message to stderr.
   */
  readonly error = (value?: unknown, options?: LogPrintOptions): void => {
    this._print(process.stderr, LogLevel.warn, value, { color: 'red', ...options });
  };

  /**
   * Print a message to stdout, regardless of log level.
   */
  readonly print = (value?: unknown, options?: LogPrintOptions): void => {
    this._print(process.stdout, LogLevel.silent, value, options);
  };

  /**
   * Print a message to stderr, regardless of log level.
   */
  readonly printErr = (value?: unknown, options?: LogPrintOptions): void => {
    this._print(process.stderr, LogLevel.silent, value, options);
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
   *
   * @protected
   */
  readonly _print = (
    stream: Writable,
    level: LogLevel,
    value: unknown,
    { once = false, prefix = true, color, style }: LogPrintOptions = {},
  ): void => {
    if (this.isLevel(level)) {
      const text = getMessage(value);

      if (!once || this.#isFirstOccurrence(text)) {
        stream.write(
          `${prefix ? this.prefix : ''}${color ? Ansi.color[color] : ''}${style ? Ansi[style] : ''}${text}${
            Ansi.reset
          }\n`,
        );
      }
    }
  };

  readonly #onStreamData = (stream: Writable, line: string): void => {
    // Omit blank lines when prefixing is enabled.
    if (!line && this.prefixText) return;

    this._print(stream, LogLevel.silent, line);
  };

  readonly #isFirstOccurrence = (message: string): boolean => {
    if (occurrences.has(message)) {
      return false;
    }

    occurrences.add(message);

    return true;
  };
}

export const log = new Log();
