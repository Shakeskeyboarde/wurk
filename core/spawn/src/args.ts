export interface LiteralArg {
  readonly literal: string;
}

export type SpawnSparseArgs = readonly (
  | string
  | number
  | false
  | null
  | undefined
  | SpawnSparseArgs
)[];

export const isLiteralArg = (arg: unknown): arg is LiteralArg => {
  return typeof arg === 'object' && arg !== null && 'literal' in arg;
};

export const getArgs = (args: SpawnSparseArgs): string[] => {
  return args.flatMap((value): string | string[] => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString(10);
    if (Array.isArray(value)) return getArgs(value);

    return [];
  });
};
