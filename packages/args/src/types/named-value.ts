export type NamedValue<TUsage extends string> = TUsage extends `${string}<${string}..>` | `${string}<..${string}>`
  ? { required: true; variadic: true }
  : TUsage extends `${string}<${string}>`
    ? { required: true; variadic: false }
    : TUsage extends `${string}[${string}..]` | `${string}[..${string}]`
      ? { required: false; variadic: true }
      : TUsage extends `${string}[${string}]`
        ? { required: false; variadic: false }
        : false;
