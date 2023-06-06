import util from 'node:util';

import getAnsiRegex from 'ansi-regex';
import chalk from 'chalk';

export interface LogOptions {
  prefix?: string;
  trim?: boolean;
}

export type LogLevel = keyof typeof LOG_LEVEL;

const ansiRegex = getAnsiRegex();

export const LOG_LEVEL = {
  silent: 0,
  error: 10,
  warn: 20,
  notice: 30,
  info: 40,
  debug: 50,
  trace: 60,
} as const;

export class Log implements LogOptions {
  readonly prefix: string;
  readonly trim: boolean;

  /**
   * Copy constructor for threading support.
   */
  constructor({ prefix = '', trim = false }: LogOptions = {}) {
    this.prefix = prefix;
    this.trim = trim;
  }

  getLevel(): { name: LogLevel; value: number } {
    const name: LogLevel =
      process.env.LOG_LEVEL && process.env.LOG_LEVEL in LOG_LEVEL ? (process.env.LOG_LEVEL as LogLevel) : 'info';
    const value = LOG_LEVEL[name];

    return { name, value };
  }

  /**
   * Print a dimmed message to stderr.
   */
  trace(message?: unknown): void {
    if (LOG_LEVEL.trace <= this.getLevel().value) this.writeOut(message, chalk.dim);
  }

  /**
   * Print a dimmed message to stderr.
   */
  debug(message?: unknown): void {
    if (LOG_LEVEL.debug <= this.getLevel().value) this.writeOut(message, chalk.dim);
  }

  /**
   * Print an undecorated message to stdout.
   */
  info(message?: unknown): void {
    if (LOG_LEVEL.info <= this.getLevel().value) this.writeOut(message);
  }

  /**
   * Print a bold message to stderr.
   */
  notice(message?: unknown): void {
    if (LOG_LEVEL.notice <= this.getLevel().value) this.writeErr(message, chalk.bold);
  }

  /**
   * Print a yellow message to stderr.
   */
  warn(message?: unknown): void {
    if (LOG_LEVEL.warn <= this.getLevel().value) this.writeErr(message, chalk.yellowBright);
  }

  /**
   * Print a red message to stderr.
   */
  error(message?: unknown): void {
    if (LOG_LEVEL.error <= this.getLevel().value) this.writeErr(message, chalk.redBright);
  }

  /**
   * Write an undecorated message to stdout.
   */
  writeOut(message?: unknown, formatLine?: (message: string) => string): void {
    process.stdout.write(this.#format(message, formatLine) + '\n');
  }

  /**
   * Write an undecorated message to stdout.
   */
  writeErr(message?: unknown, formatLine?: (message: string) => string): void {
    process.stderr.write(this.#format(message, formatLine) + '\n');
  }

  #format(message: unknown, formatLine?: (message: string) => string): string {
    let str = String(message ?? '');

    if (!this.prefix && !this.trim) {
      if (formatLine) str = formatLine(str);
      return str.endsWith('\n') ? str.slice(0, -1) : str;
    }

    let lines = str.replace(ansiRegex, '').split(/\r?\n|\r|\n/g);

    if (this.trim) {
      lines = lines.flatMap((line) => {
        line = line.trim();
        return line ? [line] : [];
      });
    } else if (lines[lines.length - 1] === '') {
      lines.pop();
    }

    if (formatLine) lines = lines.map((line) => line && formatLine(line));
    if (this.prefix) lines = lines.map((line) => this.prefix + line);

    return lines.join('\n');
  }
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
