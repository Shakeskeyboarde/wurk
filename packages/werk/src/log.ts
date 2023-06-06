import util from 'node:util';

import getAnsiRegex from 'ansi-regex';
import chalk from 'chalk';

const ansiRegex = getAnsiRegex();

export interface LogOptions {
  prefix?: string;
  trim?: boolean;
}

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

  /**
   * Print a formatted message to stdout.
   */
  info(message?: unknown): void {
    this.writeOut(message);
  }

  /**
   * Print a formatted message to stderr.
   */
  notice(message?: unknown): void {
    this.writeErr(message, chalk.bold);
  }

  /**
   * Print a formatted warning to stderr.
   */
  warn(message?: unknown): void {
    this.writeErr(message, chalk.yellowBright);
  }

  /**
   * Print a formatted error to stderr.
   */
  error(message?: unknown): void {
    this.writeErr(message, chalk.redBright);
  }

  /**
   * Write to stdout. A trailing newline is added if not present.
   */
  writeOut(message?: unknown, formatLine?: (message: string) => string): void {
    process.stdout.write(this.#format(message, formatLine) + '\n');
  }

  /**
   * Write to stdout. A trailing newline is added if not present.
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
