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

const onceCache = new Set<string>();

export const parseLogLevel = (value: string): LogLevel => {
  switch (value) {
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

  readonly stdout: Writable = new LogStream();
  readonly stderr: Writable = new LogStream();
  readonly prefix: string;
  readonly formatPrefix: (prefix: string) => string;

  constructor({ prefix = '', formatPrefix = identity }: LogOptions = {}) {
    this.stdout.on('data', (line: string) => this.#writeLine(process.stdout, line));
    this.stderr.on('data', (line: string) => this.#writeLine(process.stderr, line));
    this.prefix = prefix;
    this.formatPrefix = formatPrefix;
  }

  get level(): { readonly name: LogLevel; readonly value: number } {
    return Log.#level;
  }

  /**
   * Print a dimmed message to stderr.
   */
  readonly silly = (message?: unknown): void => {
    if (LOG_LEVEL_VALUES.silly <= this.level.value) {
      this.#write(process.stderr, message, chalk.dim);
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
    if (LOG_LEVEL_VALUES.verbose <= this.level.value) {
      this.#write(process.stderr, message, chalk.dim);
    }
  };
  /**
   * Alias for `verbose`.
   */
  readonly debug = this.verbose;

  /**
   * Print an undecorated message to stdout.
   */
  readonly info = (message?: unknown): void => {
    if (LOG_LEVEL_VALUES.info <= this.level.value) {
      this.#write(process.stdout, message);
    }
  };

  /**
   * Print a bright message to stderr.
   */
  readonly notice = (message?: unknown): void => {
    if (LOG_LEVEL_VALUES.notice <= this.level.value) {
      this.#write(process.stderr, message, chalk.whiteBright);
    }
  };

  /**
   * Print a yellow message to stderr.
   */
  readonly warn = (message?: unknown): void => {
    if (LOG_LEVEL_VALUES.warn <= this.level.value) {
      this.#write(process.stderr, message, chalk.yellowBright);
    }
  };

  /**
   * Print a yellow message to stderr, but only if the message has not
   * been printed before.
   */
  readonly warnOnce = (message?: unknown): void => {
    if (LOG_LEVEL_VALUES.warn <= this.level.value) {
      this.#write(process.stderr, message, chalk.yellowBright, true);
    }
  };

  /**
   * Print a red message to stderr.
   */
  readonly error = (message?: unknown): void => {
    if (LOG_LEVEL_VALUES.error <= this.level.value) {
      this.#write(process.stderr, message, chalk.redBright);
    }
  };

  /**
   * Print a red message to stderr, but only if the message has not been
   * printed before.
   */
  readonly errorOnce = (message?: unknown): void => {
    if (LOG_LEVEL_VALUES.error <= this.level.value) {
      this.#write(process.stderr, message, chalk.redBright, true);
    }
  };

  readonly #write = (
    stream: Writable,
    message: unknown,
    formatLine?: (message: string) => string,
    once = false,
  ): void => {
    const string = String(
      message instanceof Error ? (process.env.DEBUG ? message.stack ?? message : message.message) : message ?? '',
    );

    if (once) {
      if (onceCache.has(string)) return;
      onceCache.add(string);
    }

    const lines = string.split(/\r?\n|\r/u);

    lines.forEach((line) => this.#writeLine(stream, line + '\n', formatLine));
  };

  readonly #writeLine = (stream: Writable, line: string, formatLine: (message: string) => string = identity): void => {
    /*
     * Remove ANSI escape codes because lines with different
     * (unterminated) formatting might be interleaved due to
     * multi-threading.
     */
    line = line.replace(ANSI_REGEXP, '');

    if (this.prefix.length) {
      /*
       * Prefixing lines implies that line terminators must be added if
       * if missing, and that blank lines must be omitted.
       */
      line = line.trimEnd() + '\n';
      if (line.length <= 1) return;
      line = `${this.formatPrefix(this.prefix)}: ${formatLine(line)}`;
    } else {
      line = formatLine(line);
    }

    stream.write(line);
  };
}

const identity = <T>(value: T): T => value;

export const log = new Log();
