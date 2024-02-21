type Simplify<T> = T extends object ? { [K in keyof T]: T[K] } : T;

type Whitespace = ' ' | '\n' | '\r' | '\t';

type Trim<TString extends string, TSpace extends string = Whitespace> = TString extends `${TSpace extends ''
  ? never
  : TSpace}${infer TRight}`
  ? Trim<TRight, TSpace>
  : TString extends `${infer TLeft}${TSpace extends '' ? never : TSpace}`
    ? Trim<TLeft, TSpace>
    : TString;

type Split<
  TString extends string,
  TSep extends string,
  TSpace extends string = Exclude<' ', TSep>,
> = TString extends `${infer TLeft}${TSep extends '' ? never : TSep}${infer TRight}`
  ? [...Split<TLeft, TSep, TSpace>, ...Split<TRight, TSep, TSpace>]
  : [Trim<TString, TSpace>];

type CamelCase<T> = T extends string
  ? Trim<T, '-' | '_' | '.' | Whitespace> extends `${infer TLeft}${'-' | '_' | '.' | Whitespace}${infer TRight}`
    ? `${Lowercase<TLeft>}${Capitalize<CamelCase<TRight>>}`
    : Lowercase<Trim<T, '-' | '_' | '.' | Whitespace>>
  : never;

type PickByType<TObject extends object, TType> = {
  [P in keyof TObject as TType extends TObject[P] ? P : never]: TObject[P];
};

type PickOptional<TObject extends object> = {
  [P in keyof TObject as {} extends Pick<TObject, P> ? P : undefined extends TObject[P] ? P : never]?: TObject[P];
};

type UnionProps<T0 extends object, T1 extends object> = any extends any
  ? Simplify<{
      [P in keyof T0 | keyof T1]: (P extends keyof T0 ? T0[P] : never) | (P extends keyof T1 ? T1[P] : never);
    }>
  : never;

type KeyOf<T> = Extract<keyof T, string>;

type LastValue<TValue extends any[]> = TValue extends readonly [...any[], infer TLast]
  ? TLast
  : TValue extends (infer TLast)[]
    ? TLast | (TValue extends [any, ...any[]] ? never : undefined)
    : never;

export type { CamelCase, KeyOf, LastValue, PickByType, PickOptional, Split, UnionProps };
