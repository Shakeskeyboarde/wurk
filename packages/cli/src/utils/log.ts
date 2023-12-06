import assert from 'node:assert';
import { type Writable } from 'node:stream';

import getAnsiRegex from 'ansi-regex';
import chalk from 'chalk';

import { LogStream } from './log-stream.js';

export interface LogOptions {
  prefix?: string;
  formatPrefix?: (prefix: string) => string;
}

export type LogLevel = keyof typeof LOG_LEVEL_VALUES;

const ANSI_REGEXP = getAnsiRegex();
const ANSI_NEWLINE_ENDING_REGEXP = new RegExp(`\\n(?:${ANSI_REGEXP.source})*$`, 'u');

const LOG_LEVEL_VALUES = {
  silent: 0,
  error: 10,
  warn: 20,
  notice: 30,
  info: 40,
  verbose: 50,
  silly: 60,
} as const;

const LOG_LEVEL_DEFAULT: LogLevel =
  process.env.WERK_LOG_LEVEL && process.env.WERK_LOG_LEVEL in LOG_LEVEL_VALUES
    ? (process.env.WERK_LOG_LEVEL as LogLevel)
    : 'warn';

const occurrences = new Set<string>();

const stringify = (message: unknown): string => {
  const text = String(
    message instanceof Error ? (process.env.DEBUG ? message.stack ?? message : message.message) : message ?? '',
  );

  return ANSI_NEWLINE_ENDING_REGEXP.test(text) ? text : text + '\n';
};

export const parseLogLevel = (value: string): LogLevel => {
  switch (value) {
    case 'trace':
      value = 'silly' satisfies keyof typeof LOG_LEVEL_VALUES;
      break;
    case 'debug':
      value = 'verbose' satisfies keyof typeof LOG_LEVEL_VALUES;
      break;
  }

  assert(
    value in LOG_LEVEL_VALUES,
    new Error(`Log level must be one of: ${Object.keys(LOG_LEVEL_VALUES).join(', ')}.`),
  );
  return value as LogLevel;
};

export class Log {
  static #level: { readonly name: LogLevel; readonly value: number } = {
    name: LOG_LEVEL_DEFAULT,
    value: LOG_LEVEL_VALUES[LOG_LEVEL_DEFAULT],
  };

  static get level(): { readonly name: LogLevel; readonly value: number } {
    return Log.#level;
  }

  static setLevel(level: LogLevel): void {
    process.env.WERK_LOG_LEVEL = level;
    Log.#level = { name: level, value: LOG_LEVEL_VALUES[level] };
  }

  readonly #prefix: string;
  readonly stdout: Writable = new LogStream();
  readonly stderr: Writable = new LogStream();
  readonly prefix: string;
  readonly formatPrefix: (prefix: string) => string;

  constructor({ prefix = '', formatPrefix = identity }: LogOptions = {}) {
    this.stdout.on('data', this.#onData.bind(this, process.stdout));
    this.stderr.on('data', this.#onData.bind(this, process.stderr));
    this.prefix = prefix;
    this.formatPrefix = formatPrefix;
    this.#prefix = this.prefix ? `${this.formatPrefix(this.prefix)}: ` : '';
  }

  get level(): { readonly name: LogLevel; readonly value: number } {
    return Log.#level;
  }

  readonly isLevel = (level: LogLevel | number): boolean => {
    const value = typeof level === 'number' ? level : LOG_LEVEL_VALUES[level];
    return value <= this.level.value;
  };

  /**
   * Print a dimmed message to stderr.
   */
  readonly silly = (message?: unknown): void => {
    if (this.isLevel(LOG_LEVEL_VALUES.silly)) {
      process.stderr.write(`${this.#prefix}${chalk.dim(stringify(message))}`);
    }
  };
  /**
   * Alias for `silly`.
   */
  readonly trace = this.silly;

  /**
   * Print a dimmed message to stderr.
   */
  readonly verbose = (message?: unknown): void => {
    if (this.isLevel(LOG_LEVEL_VALUES.verbose)) {
      process.stderr.write(`${this.#prefix}${chalk.dim(stringify(message))}`);
    }
  };
  /**
   * Alias for `verbose`.
   */
  readonly debug = this.verbose;

  /**
   * Print an uncolored message to stdout.
   */
  readonly info = (message?: unknown): void => {
    if (this.isLevel(LOG_LEVEL_VALUES.info)) {
      process.stderr.write(`${this.#prefix}${stringify(message)}`);
    }
  };

  /**
   * Print an emphasized message to stderr.
   */
  readonly notice = (message?: unknown): void => {
    if (this.isLevel(LOG_LEVEL_VALUES.notice)) {
      process.stderr.write(`${this.#prefix}${chalk.whiteBright(stringify(message))}`);
    }
  };

  /**
   * Alias for `notice`, printed in green.
   */
  readonly success = (message?: unknown): void => {
    if (this.isLevel(LOG_LEVEL_VALUES.notice)) {
      process.stderr.write(`${this.#prefix}${chalk.greenBright(stringify(message))}`);
    }
  };

  /**
   * Print a yellow message to stderr.
   */
  readonly warn = (message?: unknown): void => {
    if (this.isLevel(LOG_LEVEL_VALUES.warn)) {
      process.stderr.write(`${this.#prefix}${chalk.yellowBright(stringify(message))}`);
    }
  };

  /**
   * Print a yellow message to stderr, but only if the message has not
   * been printed before.
   */
  readonly warnOnce = (message?: unknown): void => {
    if (this.isLevel(LOG_LEVEL_VALUES.warn)) {
      const text = stringify(message);

      if (this.#isFirstOccurrence(text)) {
        process.stderr.write(`${this.#prefix}${chalk.yellowBright(text)}`);
      }
    }
  };

  /**
   * Print a red message to stderr.
   */
  readonly error = (message?: unknown): void => {
    if (this.isLevel(LOG_LEVEL_VALUES.error)) {
      process.stderr.write(`${this.#prefix}${chalk.redBright(stringify(message))}`);
    }
  };

  /**
   * Print a red message to stderr, but only if the message has not been
   * printed before.
   */
  readonly errorOnce = (message?: unknown): void => {
    if (this.isLevel(LOG_LEVEL_VALUES.error)) {
      const text = stringify(message);

      if (this.#isFirstOccurrence(text)) {
        process.stderr.write(`${this.#prefix}${chalk.redBright(text)}`);
      }
    }
  };

  /**
   * Print an uncolored message to stdout, regardless of log level.
   */
  readonly print = (message: unknown): void => {
    process.stderr.write(`${this.#prefix}${stringify(message)}`);
  };

  readonly flush = (): void => {
    (this.stdout as LogStream).flush();
    (this.stderr as LogStream).flush();
  };

  readonly #isFirstOccurrence = (message: string): boolean => {
    if (occurrences.has(message)) {
      return false;
    }

    occurrences.add(message);

    return true;
  };

  readonly #onData = (stream: Writable, line: string): void => {
    // Omit blank lines when prefixing is enabled.
    if (!line && this.prefix) return;

    stream.write(`${this.#prefix}${line}\n`);
  };
}

const identity = <T>(value: T): T => value;

export const log = new Log();
