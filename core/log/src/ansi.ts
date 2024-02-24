import tty from 'node:tty';

import ansiRegex from 'ansi-regex';

export type AnsiColor = (typeof ANSI_COLORS)[number];

const ANSI_REGEXP = new RegExp(ansiRegex().source, 'gu');

const IS_TTY =
  tty.isatty(1) &&
  tty.isatty(2) &&
  Boolean(process.env.TERM && process.env.TERM !== 'dumb');

const IS_COLOR = process.env.NO_COLOR
  ? false
  : process.env.FORCE_COLOR
    ? true
    : IS_TTY;

export const ANSI_COLORS = [
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
] as const;

export const Ansi = {
  get clear(): string {
    return IS_TTY ? '\u001B[3J\u001B[2J\u001B[H' : '';
  },
  get reset(): string {
    return IS_COLOR ? '\u001B[0m' : '';
  },
  get bold(): string {
    return IS_COLOR ? '\u001B[1m' : '';
  },
  get dim(): string {
    return IS_COLOR ? '\u001B[2m' : '';
  },
  color: {
    get red(): string {
      return IS_COLOR ? '\u001B[31;91m' : '';
    },
    get green(): string {
      return IS_COLOR ? '\u001B[32;92m' : '';
    },
    get yellow(): string {
      return IS_COLOR ? '\u001B[33;93m' : '';
    },
    get blue(): string {
      return IS_COLOR ? '\u001B[34;94m' : '';
    },
    get magenta(): string {
      return IS_COLOR ? '\u001B[35;95m' : '';
    },
    get cyan(): string {
      return IS_COLOR ? '\u001B[36;96m' : '';
    },
  } satisfies Record<AnsiColor, string>,
  strip: (text: string): string => {
    return text.replace(ANSI_REGEXP, '');
  },
} as const;
