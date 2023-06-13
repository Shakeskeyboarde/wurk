/* eslint-disable func-style */
type Simplify<T> = T extends Record<string, unknown> ? { [K in keyof T]: T[K] } : T;
type Merge<A, B> = A | B extends Record<string, unknown>
  ? {
      [K in keyof A & keyof B]: Merge<A[K], B[K]> | (undefined extends B[K] ? A[K] : never);
    } & Omit<A, keyof B> &
      Omit<B, keyof A>
  : B;
type MergeRecursive<A, B extends any[]> = B extends [infer B0, ...infer BN] ? Merge<A, MergeRecursive<B0, BN>> : A;
type Merged<A, B extends any[]> = Simplify<MergeRecursive<A, B>>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function merge<A, B extends any[]>(a: A, ...b: B): Merged<A, B>;
export function merge(a: any, ...bn: any[]): any {
  if (bn.length === 0) return a;

  const b = merge(...(bn as [any, ...any[]]));

  if (a !== b && isObject(a) && isObject(b)) {
    let result: Record<string, any> = { ...a };

    for (const [key, value] of Object.entries(b)) {
      if (key in result) {
        const merged = merge(result[key], value);
        if (merged !== result[key]) result = { ...result, [key]: merged };
      } else {
        result = { ...result, [key]: value };
      }
    }

    return result;
  }

  return b;
}
