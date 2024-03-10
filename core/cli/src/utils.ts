const camelCase = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/^[\s._-]+|[\s._-]+$/gu, '')
    .replace(/[\s._-]+([^[\s._-])/gu, (_, letter) => letter.toUpperCase());
};

const resolve = <TSource, TValue, TDefault = undefined>(
  source: TSource | undefined | null,
  next: (source: TSource) => TSource | undefined | null,
  get: (source: TSource) => TValue | undefined | null,
  defaultValue?: TDefault,
): TValue | TDefault => {
  for (
    let current: TSource | undefined | null = source;
    current;
    current = next(current)
  ) {
    const value = get(current);

    if (value != null) {
      return value;
    }
  }

  return defaultValue as TDefault;
};

/**
 * Wrap text at a given number of columns.
 *
 * The wrapped text and length of the longest line is returned.
 *
 * Leading and trailing whitespace is ignored, and all other whitespace is
 * collapsed to a single space character.
 */
const wrap = (text: string, columns: number, newline = '\n'): string => {
  const iterator = text
    .trim()
    .matchAll(/(?<space>\s+)|(?<word>\S+?)(?=\s|(?<=[a-z]-)[a-z]|$)/guy);

  let result = '';
  let lineLength = 0;
  let spaceLength = 0;

  for (const match of iterator) {
    const { space = '', word = '' } = match.groups!;

    if (word) {
      if (lineLength > 0 && word.length + spaceLength > columns) {
        result += newline;
        lineLength = 0;
      }
      else if (spaceLength) {
        result += ' ';
        lineLength += 1;
      }

      result += word;
      lineLength += word.length;
      spaceLength = 0;
    }
    else if (space && lineLength) {
      spaceLength = 1;
    }
  }

  return result;
};

export { camelCase, resolve, wrap };
