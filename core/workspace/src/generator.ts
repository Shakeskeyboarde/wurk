export const getDepthFirstGenerator = function *<T>(
  root: Iterable<T>,
  getRelated: (current: T) => Iterable<T> | undefined,
  filter: (current: T) => boolean = () => true,
): Generator<T> {
  const marked = new Set<T>();
  const next = function *(values: Iterable<T> | undefined): Generator<T> {
    if (!values) return;

    for (const value of values) {
      if (marked.has(value)) continue;
      if (!filter(value)) continue;

      // Mark before iterating over related to prevent infinite recursion in
      // the case of a circular graphs.
      marked.add(value);
      yield* next(getRelated(value));
      yield value;
    }
  };

  yield* next(root);
};

export class GeneratorIterable<T> implements Iterable<T> {
  readonly #getGenerator: () => Generator<T>;

  constructor(getGenerator: () => Generator<T>) {
    this.#getGenerator = getGenerator;
  }

  [Symbol.iterator](): Generator<T> {
    return this.#getGenerator();
  }
}
