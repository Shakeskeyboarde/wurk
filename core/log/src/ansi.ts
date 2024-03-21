import nodeTty from 'node:tty';

import ansiRegex from 'ansi-regex';

/**
 * Simple ANSI color names (8 colors).
 */
export type AnsiColor = (typeof ANSI_COLORS)[number];

const ANSI_REGEXP = new RegExp(ansiRegex().source, 'gu');

const IS_TTY = nodeTty.isatty(1)
  && nodeTty.isatty(2)
  && Boolean(process.env.TERM && process.env.TERM !== 'dumb');

const IS_COLOR = process.env.NO_COLOR
  ? false
  : process.env.FORCE_COLOR
    ? true
    : IS_TTY;

const IS_256_COLOR = IS_COLOR && Boolean(process.env.TERM === 'xterm-256color');

/**
 * Simple ANSI color names (8 colors).
 */
export const ANSI_COLORS = [
  'black',
  'red',
  'yellow',
  'green',
  'cyan',
  'blue',
  'magenta',
  'white',
] as const;

/**
 * ANSI color and style control code utilities.
 */
export const Ansi = {
  reset: IS_COLOR ? '\u001B[0m' : '',
  bold: IS_COLOR ? '\u001B[1m' : '',
  dim: IS_COLOR ? '\u001B[2m' : '',
  color: {
    black: IS_COLOR ? '\u001B[30;90m' : '',
    red: IS_COLOR ? '\u001B[31;91m' : '',
    green: IS_COLOR ? '\u001B[32;92m' : '',
    yellow: IS_COLOR ? '\u001B[33;93m' : '',
    blue: IS_COLOR ? '\u001B[34;94m' : '',
    magenta: IS_COLOR ? '\u001B[35;95m' : '',
    cyan: IS_COLOR ? '\u001B[36;96m' : '',
    white: IS_COLOR ? '\u001B[37;97m' : '',
  } as const,
  color256: Array.from({ length: 256 })
    .map((_, i) => {
      return IS_256_COLOR ? (`\u001B[38;5;${i}m` as const) : '';
    }) as readonly string[] & { length: 256 },
  getColor: (color: AnsiColor | number): string => {
    return typeof color === 'number'
      ? Ansi.color256[color % Ansi.color256.length]!
      : Ansi.color[color];
  },
  strip: (text: string): string => {
    return text.replace(ANSI_REGEXP, '');
  },
} as const;

/**
 * Iterates over colors which are useful for color coding text. This does not
 * include white and black, or colors which are too similar to differentiate.
 */
export const getAnsiColorIterator = function *<TLoop extends boolean = false>(options: {
  readonly is256Enabled?: boolean;
  readonly loop?: TLoop;
  readonly count?: number;
} = {}): Iterator<string, TLoop extends true ? never : undefined, undefined> {
  const { is256Enabled = IS_256_COLOR, loop = false as TLoop, count } = options;

  if (is256Enabled && (count == null || count > 6)) {
    const colors = [
      196, 202, 208, 214, 220, 226, 154, 46, 49, 51, 45, 39, 33, 21, 57, 129,
      165, 201, 207, 171, 135, 99, 63, 69, 75, 81, 123, 86, 84, 119, 191, 228,
      221, 215, 209, 203,
    ].map((index) => Ansi.getColor(index));

    for (
      let i = 0;
      i < colors.length;
      i = loop ? (i + 1) % colors.length : i + 1
    ) {
      yield colors[
        count == null || count < 1 || count >= 18
          ? i
          : Math.floor(i * (18 / count))
      ]!;
    }

    return undefined as never;
  }

  const colors = (
    ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta'] as const
  ).map((name) => {
    return Ansi.getColor(name);
  });

  for (
    let i = 0;
    i < colors.length;
    i = loop ? (i + 1) % colors.length : i + 1
  ) {
    yield colors[i]!;
  }

  return undefined as never;
};
