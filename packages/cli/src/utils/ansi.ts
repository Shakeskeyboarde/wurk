import ansiRegex from 'ansi-regex';

const ANSI_REGEXP = new RegExp(ansiRegex().source, 'gu');

export const Ansi = {
  get reset(): string {
    return process.env.NO_COLOR ? '' : '\u001B[0m';
  },
  get bold(): string {
    return process.env.NO_COLOR ? '' : '\u001B[1m';
  },
  get dim(): string {
    return process.env.NO_COLOR ? '' : '\u001B[2m';
  },
  color: {
    get red(): string {
      return process.env.NO_COLOR ? '' : '\u001B[31;91m';
    },
    get green(): string {
      return process.env.NO_COLOR ? '' : '\u001B[32;92m';
    },
    get yellow(): string {
      return process.env.NO_COLOR ? '' : '\u001B[33;93m';
    },
    get blue(): string {
      return process.env.NO_COLOR ? '' : '\u001B[34;94m';
    },
    get magenta(): string {
      return process.env.NO_COLOR ? '' : '\u001B[35;95m';
    },
    get cyan(): string {
      return process.env.NO_COLOR ? '' : '\u001B[36;96m';
    },
  },
  strip: (text: string): string => {
    return text.replace(ANSI_REGEXP, '');
  },
} as const;

export type AnsiColor = keyof typeof Ansi.color;
