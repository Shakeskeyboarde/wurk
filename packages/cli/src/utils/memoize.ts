export const memoize = <T extends () => any>(fn: T): (() => ReturnType<T>) => {
  let result: { value: ReturnType<T> } | undefined;

  return (): ReturnType<T> => {
    if (!result) {
      result = { value: fn() };
    }

    return result.value;
  };
};
