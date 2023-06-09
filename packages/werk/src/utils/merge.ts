/* eslint-disable func-style */
type Simplify<T> = T extends Record<string, unknown> ? { [K in keyof T]: T[K] } : T;
type Merge<A, B> = A | B extends Record<string, unknown>
  ? {
      [K in keyof A & keyof B]: Merge<A[K], B[K]> | (undefined extends B[K] ? A[K] : never);
    } & Omit<A, keyof B> &
      Omit<B, keyof A>
  : B;
type Merged<A, B> = Simplify<Merge<A, B>>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function merge<A, B>(a: A, b: B): Merged<A, B>;
export function merge(a: any, b: any): any {
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
