export const iterateDepthFirst = function* <T>(
  root: Iterable<T>,
  getRelated: (current: T) => Iterable<T> | undefined,
): Generator<T> {
  const marked = new Set<T>();
  const next = function* (values: Iterable<T> | undefined): Generator<T> {
    if (!values) return;

    for (const value of values) {
      if (marked.has(value)) continue;

      // Mark before iterating over dependencies to prevent infinite
      // recursion in the case of a circular dependency.
      marked.add(value);
      yield* next(getRelated(value));
      yield value;
    }
  };

  yield* next(root);
};

export class DepthFirstIterable<T> implements Iterable<T> {
  readonly #root: Iterable<T>;
  readonly #getRelated: (current: T) => Iterable<T> | undefined;

  constructor(root: Iterable<T>, getRelated: (current: T) => Iterable<T> | undefined) {
    this.#root = root;
    this.#getRelated = getRelated;
  }

  *[Symbol.iterator](): Iterator<T> {
    yield* iterateDepthFirst(this.#root, this.#getRelated);
  }
}
