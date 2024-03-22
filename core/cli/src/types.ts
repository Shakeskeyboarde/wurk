type Simplify<T> = T extends object ? { [K in keyof T]: T[K] } : T;

type Whitespace = ' ' | '\n' | '\r' | '\t';

type Trim<
  TString extends string,
  TSpace extends string = Whitespace,
> = TString extends `${TSpace extends '' ? never : TSpace}${infer TRight}`
  ? Trim<TRight, TSpace>
  : TString extends `${infer TLeft}${TSpace extends '' ? never : TSpace}`
    ? Trim<TLeft, TSpace>
    : TString;

/**
 * Convert a string into a tuple of substrings split by a separator.
 */
export type Split<
  TString extends string,
  TSep extends string,
  TSpace extends string = Exclude<' ', TSep>,
> = TString extends `${infer TLeft}${TSep extends '' ? never : TSep}${infer TRight}`
  ? [...Split<TLeft, TSep, TSpace>, ...Split<TRight, TSep, TSpace>]
  : [Trim<TString, TSpace>];

/**
 * Convert a string to camel case.
 */
export type CamelCase<T> = T extends string
  ? Trim<T, '-' | '_' | '.' | Whitespace> extends `${infer TLeft}${'-' | '_' | '.' | Whitespace}${infer TRight}`
    ? `${Lowercase<TLeft>}${Capitalize<CamelCase<TRight>>}`
    : Lowercase<Trim<T, '-' | '_' | '.' | Whitespace>>
  : never;

/**
 * Pick the properties of an object that are assignable to a specific type.
 */
export type PickByType<TObject extends object, TType> = {
  [P in keyof TObject as TType extends TObject[P] ? P : never]: TObject[P];
};

/**
 * Pick the optional properties of an object.
 */
export type PickOptional<TObject extends object> = {
  [P in keyof TObject as {} extends Pick<TObject, P>
    ? P
    : undefined extends TObject[P]
      ? P
      : never]?: TObject[P];
};

/**
 * Pick the required properties of an object.
 */
export type PickRequired<TObject extends object> = {
  [P in keyof TObject as {} extends Pick<TObject, P>
    ? never
    : undefined extends TObject[P]
      ? never
      : P]: TObject[P];
};

/**
 * Union two objects, ignoring any keys in the second object that are already
 * present in the first object.
 */
export type UnionProps<T0 extends object, T1 extends object> = any extends any
  ? Simplify<{
    [P in keyof T0 | keyof T1]:
      | (P extends keyof T0 ? T0[P] : never)
      | (P extends keyof T1 ? T1[P] : never);
  }>
  : never;

/**
 * Infer the last value of an array.
 */
export type LastValue<TValue extends any[]> = TValue extends readonly [
  ...any[],
  infer TLast,
]
  ? TLast
  : TValue extends (infer TLast)[]
    ? TLast | (TValue extends [any, ...any[]] ? never : undefined)
    : never;

/**
 * Filter a tuple to only include unique values.
 */
export type UniqueTuple<
  T extends readonly any[],
  TT extends readonly any[] = T,
> = T extends readonly [infer V, ...infer TRest]
  ? V extends TRest[number] ? never : UniqueTuple<TRest, TT>
  : TT;
