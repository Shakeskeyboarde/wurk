import { type Writable } from 'node:stream';

import getAnsiRegex from 'ansi-regex';
import chalk from 'chalk';

import { LogStream } from './log-stream.js';

export interface LogOptions {
  prefix?: string;
  formatPrefix?: (prefix: string) => string;
}

export type LogLevel = keyof typeof LOG_LEVEL;

const ansiRegex = getAnsiRegex();

export const LOG_LEVEL = {
  silent: 0,
  error: 10,
  warn: 20,
  notice: 30,
  info: 40,
  verbose: 50,
  silly: 60,
} as const;

const defaultLevel =
  process.env.WERK_LOG_LEVEL && process.env.WERK_LOG_LEVEL in LOG_LEVEL
    ? (process.env.WERK_LOG_LEVEL as LogLevel)
    : 'info';

export class Log {
  static #level: { readonly name: LogLevel; readonly value: number } = {
    name: defaultLevel,
    value: LOG_LEVEL[defaultLevel],
  };

  static get level(): { readonly name: LogLevel; readonly value: number } {
    return Log.#level;
  }

  static setLevel(level: LogLevel): void {
    process.env.WERK_LOG_LEVEL = level;
    Log.#level = { name: level, value: LOG_LEVEL[level] };
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
    if (LOG_LEVEL.silly <= this.level.value) {
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
    if (LOG_LEVEL.verbose <= this.level.value) {
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
    if (LOG_LEVEL.info <= this.level.value) {
      this.#write(process.stdout, message);
    }
  };

  /**
   * Print a bright message to stderr.
   */
  readonly notice = (message?: unknown): void => {
    if (LOG_LEVEL.notice <= this.level.value) {
      this.#write(process.stderr, message, chalk.whiteBright);
    }
  };

  /**
   * Print a yellow message to stderr.
   */
  readonly warn = (message?: unknown): void => {
    if (LOG_LEVEL.warn <= this.level.value) {
      this.#write(process.stderr, message, chalk.yellowBright);
    }
  };

  /**
   * Print a red message to stderr.
   */
  readonly error = (message?: unknown): void => {
    if (LOG_LEVEL.error <= this.level.value) {
      this.#write(process.stderr, message, chalk.redBright);
    }
  };

  readonly #write = (stream: Writable, message: unknown, formatLine?: (message: string) => string): void => {
    const string = String(
      message instanceof Error ? (process.env.DEBUG ? message.stack ?? message : message.message) : message,
    );
    const lines = string.split(/\r?\n|\r/u);

    lines.forEach((line) => this.#writeLine(stream, line + '\n', formatLine));
  };

  readonly #writeLine = (stream: Writable, line: string, formatLine: (message: string) => string = identity): void => {
    /*
     * Remove ANSI escape codes because lines with different
     * (unterminated) formatting might be interleaved due to
     * multi-threading.
     */
    line = line.replace(ansiRegex, '');

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
