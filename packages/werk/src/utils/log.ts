import { type Writable } from 'node:stream';
import util from 'node:util';

import getAnsiRegex from 'ansi-regex';
import chalk from 'chalk';

import { LogStream } from './log-stream.js';

export interface LogOptions {
  prefix?: string;
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

export class Log implements LogOptions {
  #isDestroyed = false;

  readonly #trim;
  readonly prefix: string;
  readonly stdout: Writable = new LogStream();
  readonly stderr: Writable = new LogStream();

  constructor({ prefix = '' }: LogOptions = {}) {
    this.prefix = prefix;
    this.#trim = Boolean(prefix);
    this.stdout.on('data', (line: string) => this.#writeLine(process.stdout, line));
    this.stderr.on('data', (line: string) => this.#writeLine(process.stderr, line));
  }

  readonly getLevel = (): { name: LogLevel; value: number } => {
    const name: LogLevel =
      process.env.LOG_LEVEL && process.env.LOG_LEVEL in LOG_LEVEL ? (process.env.LOG_LEVEL as LogLevel) : 'info';
    const value = LOG_LEVEL[name];

    return { name, value };
  };

  /**
   * Print a dimmed message to stderr.
   */
  readonly silly = (message?: unknown): void => {
    if (LOG_LEVEL.silly <= this.getLevel().value) this.#write(process.stderr, message, chalk.dim);
  };

  /**
   * Print a dimmed message to stderr.
   */
  readonly verbose = (message?: unknown): void => {
    if (LOG_LEVEL.verbose <= this.getLevel().value) this.#write(process.stderr, message, chalk.dim);
  };

  /**
   * Print an undecorated message to stdout.
   */
  readonly info = (message?: unknown): void => {
    if (LOG_LEVEL.info <= this.getLevel().value) this.#write(process.stdout, message);
  };

  /**
   * Print a bold message to stderr.
   */
  readonly notice = (message?: unknown): void => {
    if (LOG_LEVEL.notice <= this.getLevel().value) this.#write(process.stderr, message, chalk.bold);
  };

  /**
   * Print a yellow message to stderr.
   */
  readonly warn = (message?: unknown): void => {
    if (LOG_LEVEL.warn <= this.getLevel().value) this.#write(process.stderr, message, chalk.yellowBright);
  };

  /**
   * Print a red message to stderr.
   */
  readonly error = (message?: unknown): void => {
    if (LOG_LEVEL.error <= this.getLevel().value) this.#write(process.stderr, message, chalk.redBright);
  };

  readonly destroy = (): void => {
    this.#isDestroyed = true;
    this.stdout.destroy();
    this.stderr.destroy();
  };

  readonly #write = (stream: Writable, message: unknown, formatLine?: (message: string) => string): void => {
    if (this.#isDestroyed) return;
    const lines = String(message ?? '').split(/\r?\n|\r/gu);
    if (lines[lines.length - 1] === '') lines.pop();
    lines.forEach((line) => this.#writeLine(stream, line, formatLine));
  };

  readonly #writeLine = (
    stream: Writable,
    line: string,
    formatLine: (message: string) => string = (value) => value,
  ): void => {
    line = line.trimEnd().replace(ansiRegex, '');
    if (!this.#trim || line) stream.write(this.prefix + formatLine(line) + '\n');
  };
}

export const log = new Log();

let consoleWarning = (): void => {
  consoleWarning = () => undefined;
  log.warn('A Werk command is using the global console object. This is not recommended.');
};

Object.assign(console, {
  log: (...args: any[]): void => {
    consoleWarning();
    log.info(util.format(...args));
  },
  warn: (...args: any[]): void => {
    consoleWarning();
    log.warn(util.format(...args));
  },
  error: (...args: any[]): void => {
    consoleWarning();
    log.error(util.format(...args));
  },
});
