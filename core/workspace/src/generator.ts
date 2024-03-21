/**
 * Get a generator that iterates over a graph in a depth-first manner.
 */
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

/**
 * An iterable wrapper for a generator function.
 */
export class GeneratorIterable<T> implements Iterable<T> {
  readonly #getGenerator: () => Generator<T>;

  /**
   * Create a new generator iterable.
   */
  constructor(getGenerator: () => Generator<T>) {
    this.#getGenerator = getGenerator;
  }

  /**
   * Return an iterator for the generator.
   */
  [Symbol.iterator](): Generator<T> {
    return this.#getGenerator();
  }
}
