import tty from 'node:tty';

import ansiRegex from 'ansi-regex';

export type AnsiColor = (typeof ANSI_COLORS)[number];

const ANSI_REGEXP = new RegExp(ansiRegex().source, 'gu');
const isTTY = tty.isatty(1) && tty.isatty(2) && Boolean(process.env.TERM && process.env.TERM !== 'dumb');
const isColorSupported = process.env.NO_COLOR ? false : process.env.FORCE_COLOR ? true : isTTY;

export const ANSI_COLORS = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan'] as const;

export const Ansi = {
  get clear(): string {
    return isTTY ? '\u001B[3J\u001B[2J\u001B[H' : '';
  },
  get reset(): string {
    return isColorSupported ? '\u001B[0m' : '';
  },
  get bold(): string {
    return isColorSupported ? '\u001B[1m' : '';
  },
  get dim(): string {
    return isColorSupported ? '\u001B[2m' : '';
  },
  color: {
    get red(): string {
      return isColorSupported ? '\u001B[31;91m' : '';
    },
    get green(): string {
      return isColorSupported ? '\u001B[32;92m' : '';
    },
    get yellow(): string {
      return isColorSupported ? '\u001B[33;93m' : '';
    },
    get blue(): string {
      return isColorSupported ? '\u001B[34;94m' : '';
    },
    get magenta(): string {
      return isColorSupported ? '\u001B[35;95m' : '';
    },
    get cyan(): string {
      return isColorSupported ? '\u001B[36;96m' : '';
    },
  } satisfies Record<AnsiColor, string>,
  strip: (text: string): string => {
    return text.replace(ANSI_REGEXP, '');
  },
} as const;
