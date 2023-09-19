type Resolver<A extends any[]> = (...args: A) => unknown;

interface MemoizeOptions {
  cacheSize?: number;
}

export const memoize = <T extends (...args: any[]) => any, A extends Parameters<T>, R extends ReturnType<T>>(
  fn: T,
  resolver: Resolver<A> = (...args) => args[0],
  { cacheSize = 1000 }: MemoizeOptions = {},
): T => {
  const primitiveCache = new Map<any, { value: R }>();
  const objectCache = new WeakMap<any, { value: R }>();
  const memoized = (...args: A): R => {
    const key = resolver(...args);
    const cache: typeof primitiveCache | typeof objectCache =
      (typeof key === 'object' && key !== null) || typeof key === 'function' ? objectCache : primitiveCache;

    let result = cache.get(key);

    if (!result) {
      result = { value: fn(...args) };
      cache.set(key, result);

      if (cache instanceof Map && cache.size > cacheSize) {
        for (const k of cache.keys()) {
          cache.delete(k);
          if (cache.size <= cacheSize) break;
        }
      }
    }

    return result.value;
  };

  return memoized as T;
};
