export type PositionalVariadic<TUsage extends string> = TUsage extends
  | `${string}..>`
  | `<..${string}`
  | `${string}..]`
  | `[..${string}`
  ? true
  : false;
