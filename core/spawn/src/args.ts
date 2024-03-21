/**
 * Used with the `SpawnOptions.logCommand.mapArgs` option to represent
 * arguments that should be passed through without modification (ie. without
 * quoting)
 */
export interface LiteralArg {
  /**
   * The literal string to pass through.
   */
  readonly literal: string;
}

/**
 * Sparse and possibly falsy arguments for spawning a child process.
 */
export type SpawnSparseArgs = readonly (
  | string
  | number
  | false
  | null
  | undefined
  | SpawnSparseArgs
)[];

/**
 * Returns true if the arg looks like a {@link LiteralArg}.
 */
export const isLiteralArg = (arg: unknown): arg is LiteralArg => {
  return typeof arg === 'object' && arg !== null && 'literal' in arg;
};

/**
 * Convert sparse arguments to a flat non-sparse array of strings.
 */
export const getArgs = (args: SpawnSparseArgs): string[] => {
  return args.flatMap((value): string | string[] => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString(10);
    if (Array.isArray(value)) return getArgs(value);

    return [];
  });
};
