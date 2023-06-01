import getAnsiRegex from 'ansi-regex';
import chalk from 'chalk';

const ansiRegex = getAnsiRegex();

export interface LogOptions {
  prefix?: string;
  trim?: boolean;
}

export class Log {
  #prefix: string;
  #trim: boolean;

  constructor({ prefix = '', trim = false }: LogOptions = {}) {
    this.#prefix = prefix;
    this.#trim = trim;
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
    console.log(this.#format(message, formatLine));
  }

  /**
   * Write to stdout. A trailing newline is added if not present.
   */
  writeErr(message?: unknown, formatLine?: (message: string) => string): void {
    console.error(this.#format(message, formatLine));
  }

  #format(message: unknown, formatLine?: (message: string) => string): string {
    let str = String(message ?? '');

    if (!this.#prefix && !this.#trim) {
      if (formatLine) str = formatLine(str);
      return str.endsWith('\n') ? str.slice(0, -1) : str;
    }

    let lines = str.replace(ansiRegex, '').split('\n');

    if (this.#trim) {
      lines = lines.flatMap((line) => {
        line = line.trim();
        return line ? [line] : [];
      });
    } else if (lines[lines.length - 1] === '') {
      lines.pop();
    }

    if (formatLine) lines = lines.map((line) => line && formatLine(line));
    if (this.#prefix) lines = lines.map((line) => this.#prefix + line);

    return lines.join('\n');
  }
}

export const log = new Log();
