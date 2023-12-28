export type SimplifyObject<T> = T extends object ? { [K in keyof T]: T[K] } : T;

export type IfNever<T, TTrue, TFalse = T> = [T] extends [never] ? TTrue : TFalse;

export type Trim<TString extends string, TSpace extends string = ' '> = TString extends `${TSpace extends ''
  ? never
  : TSpace}${infer T0}`
  ? Trim<T0, TSpace>
  : TString extends `${infer T0}${TSpace extends '' ? never : TSpace}`
    ? Trim<T0, TSpace>
    : TString;

export type Split<
  TString extends string,
  TSep extends string,
  TSpace extends string = Exclude<' ', TSep>,
> = TString extends `${infer TLeft}${TSep extends '' ? never : TSep}${infer TRight}`
  ? [...Split<TLeft, TSep, TSpace>, ...Split<TRight, TSep, TSpace>]
  : [Trim<TString, TSpace>];

export type KebobToCamelCase<T extends string> = {
  [P in T]: Trim<P, '-'> extends `${infer TLeft}-${infer TRight}`
    ? `${TLeft}${Capitalize<KebobToCamelCase<TRight>>}`
    : Trim<P, '-'>;
}[T];
