/**
 * Reference to a parent accessor and the key the parent value that this
 * accessor is associated with.
 */
export interface JsonAccessorParent {
  /**
   * The parent accessor.
   */
  readonly accessor: JsonAccessor;
  /**
   * The key of the parent value that this accessor is associated with.
   */
  readonly key: string | number;
}

/**
 * Basic JSON type names.
 */
export type JsonType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'null';

type NoInfer<T> = [T][T extends any ? 0 : never];

type JsonValue<T extends JsonType = JsonType> = T extends 'string'
  ? string
  : T extends 'number'
    ? number
    : T extends 'boolean'
      ? boolean
      : T extends 'array'
        ? unknown[]
        : T extends 'object'
          ? { [key: string]: unknown }
          : T extends 'null'
            ? null
            : unknown;

/**
 * A fluent accessor for safely reading and modifying JSON data.
 */
export class JsonAccessor {
  /**
   * The accessor's parent accessor reference, if any.
   */
  readonly parent: JsonAccessorParent | undefined;

  /**
   * True if the accessor is immutable. The `set` method will throw an error
   * when used if this is true.
   */
  readonly immutable: boolean;

  #value: JsonValue | undefined;
  #isModified = false;

  /**
   * True if the set method has been used to change the underlying value.
   */
  get isModified(): boolean {
    return this.#isModified;
  }

  /**
   * Construct a new JSON accessor for the given value.
   */
  constructor(value?: unknown, options?: { readonly parent?: JsonAccessorParent; readonly immutable?: boolean }) {
    this.#value = safeParse(JSON.stringify(value));
    this.parent = options?.parent;
    this.immutable = options?.immutable ?? false;
  }

  /**
   * Returns a new sub-accessor for the value at the given key of the current
   * accessor.
   */
  at(key: string | number): JsonAccessor {
    const value = (() => {
      if (typeof key === 'number') {
        if (Array.isArray(this.#value)) {
          return this.#value.at(key);
        }
        else {
          return undefined;
        }
      }
      else if (
        typeof this.#value === 'object'
        && this.#value != null
        && !Array.isArray(this.#value)
        && Object.prototype.hasOwnProperty.call(this.#value, key)
      ) {
        return this.#value[key];
      }
      else {
        return undefined;
      }
    })();

    return new JsonAccessor(value, { parent: { accessor: this, key }, immutable: this.immutable });
  }

  /**
   * Returns the underlying value if it matches one of the types. Otherwise
   * return undefined or the alternative value.
   */
  as<TJsonType extends JsonType, TValue = JsonValue<TJsonType>, TAltValue = undefined>(
    types: TJsonType | [TJsonType, ...TJsonType[]] | ((value: unknown) => value is TValue),
    alt: (() => TAltValue) | TAltValue = undefined as TAltValue,
  ): TValue | NoInfer<TAltValue> {
    const value = safeParse(JSON.stringify(this.#value));
    const getAlt = typeof alt === 'function'
      ? alt as (() => TAltValue)
      : (): TAltValue => alt;

    if (typeof types === 'function') {
      return types(value) ? (value as TValue) : getAlt();
    }

    for (const type of Array.isArray(types) ? types : [types]) {
      switch (type) {
        case 'null':
          if (value === null) {
            return value as TValue;
          }
          break;
        case 'array':
          if (Array.isArray(value)) {
            return value as TValue;
          }
          break;
        case 'object':
          if (typeof value === 'object' && value != null) {
            return value as TValue;
          }
          break;
        default:
          if (typeof value === type) {
            return value as TValue;
          }
          break;
      }
    }

    return getAlt();
  }

  /**
   * Returns true if the underlying value matches one of the types.
   */
  is(types: JsonType | [JsonType, ...JsonType[]] | ((value: unknown) => boolean)): boolean {
    return (
      this.as(types as
      | JsonType
      | [JsonType, ...JsonType[]]
      | ((value: unknown) => value is unknown)) !== undefined
    );
  }

  /**
   * Returns true if the underlying value is not undefined.
   */
  exists(): boolean {
    return this.#value !== undefined;
  }

  /**
   * Returns the keys of the underlying value if it is an object. Otherwise, it
   * returns an empty array.
   */
  keys(type: 'object'): string[];
  /**
   * Returns the keys of the underlying value if it is an array. Otherwise, it
   * returns an empty array.
   */
  keys(type: 'array'): number[];
  /**
   * Returns the keys of the underlying value if it is an array or object.
   * Returns an empty array if the value is not an array or object.
   */
  keys(type?: 'array' | 'object'): number[] | string[];
  keys(type?: 'array' | 'object'): number[] | string[] {
    if (Array.isArray(this.#value)) {
      if (type === 'array' || type == null) {
        return this.#value.map((_, i) => i);
      }
      else {
        return [];
      }
    }
    else if (type === 'object' || type == null) {
      if (typeof this.#value === 'object' && this.#value != null) {
        return Object.keys(this.#value);
      }
      else {
        return [];
      }
    }
    else {
      return [];
    }
  }

  /**
   * Returns the values of the underlying value if it is an array or object.
   * Returns an empty array if the value is not an array or object.
   */
  values(): unknown[] {
    if (Array.isArray(this.#value)) {
      return this.#value;
    }
    else if (typeof this.#value === 'object' && this.#value != null) {
      return Object.values(this.#value);
    }
    else {
      return [];
    }
  }

  /**
   * Returns the entry tuples of the underlying value if it is an array.
   * Otherwise, it returns an empty array.
   */
  entries(type: 'array'): [number, unknown][];
  /**
   * Returns the entry tuples of the underlying value if it is an object.
   * Otherwise, it returns an empty array.
   */
  entries(type: 'object'): [string, unknown][];
  /**
   * Returns the entry tuples of the underlying value if it is an array or
   * object. Returns an empty array if the value is not an array or object.
   */
  entries(type?: 'array' | 'object'): [number | string, unknown][];
  entries(type?: 'array' | 'object'): [number | string, unknown][] {
    if (Array.isArray(this.#value)) {
      if (type === 'array' || type == null) {
        return this.#value.map((value, i) => [i, value]);
      }
      else {
        return [];
      }
    }
    else if (type === 'object' || type == null) {
      if (typeof this.#value === 'object' && this.#value != null) {
        return Object.entries(this.#value);
      }
      else {
        return [];
      }
    }
    else {
      return [];
    }
  }

  /**
   * Apply a mapping callback to all values of the underlying value if it is
   * an array, and return the mapped results. Returns undefined if the value
   * is not an array.
   */
  map<TValue>(callback: (value: JsonAccessor, index: number) => TValue): TValue[] | undefined {
    return this.as('array')
      ?.map((value, index) => callback(new JsonAccessor(value), index));
  }

  /**
   * Convenience method which creates a closure that receives the current
   * accessor, and can return a value derived from it. This is useful for
   * to avoid accessing the same nested value multiple times.
   *
   * ```ts
   * const value = accessor.at('values').at('data').compose((data) => {
   *   return {
   *     foo: data.at('foo').unwrap(),
   *     bar: data.at('bar').unwrap(),
   *   };
   * });
   *
   * // Instead of accessing values.data multiple times.
   *
   * const value = {
   *   foo: accessor.at('values').at('data').at('foo').unwrap(),
   *   bar: accessor.at('values').at('data').at('bar').unwrap(),
   * }
   * ```
   */
  compose<TValue>(callback: (self: JsonAccessor) => TValue): TValue {
    return callback(this);
  }

  /**
   * Derive and set the underlying value of the current accessor using a
   * factory function. If the accessor is immutable, an error will be thrown.
   *
   * NOTE: You should only set JSON serializable values, or `undefined` to
   * remove the current value from the parent accessor.
   */
  set(factory: (self: JsonAccessor) => unknown): void;
  /**
   * Set the underlying value of the current accessor. If the accessor is
   * immutable, an error will be thrown.
   *
   * NOTE: You should only set JSON serializable values, or `undefined` to
   * remove the current value from the parent accessor.
   */
  set(value: unknown): void;
  set(factoryOrValue: unknown): void {
    if (this.immutable) {
      throw new Error('JSON accessor is immutable');
    }

    const value = typeof factoryOrValue === 'function'
      ? factoryOrValue(this)
      : factoryOrValue;
    const newValue = safeParse(JSON.stringify(value));

    this.#isModified = newValue !== this.#value;
    this.#value = newValue;

    if (this.parent) {
      const { accessor, key } = this.parent;

      if (typeof key === 'number') {
        accessor.set(accessor.as('array', [])
          .splice(key, 1, this.#value));
      }
      else {
        accessor.set(Object.assign(accessor.as('object', {}), { [key]: this.#value }));
      }
    }
  }

  /**
   * Create a copy of the current accessor. The underlying value will be
   * deep copied, and the copy will be mutable by default. You can provide
   * an initializer function to modify the copy before it is returned.
   */
  copy(options: {
    readonly initializer?: (copy: JsonAccessor) => void;
    readonly immutable?: boolean;
  } = {}): JsonAccessor {
    const { initializer, immutable } = options;
    let accessor: JsonAccessor = this;

    if (initializer) {
      accessor = new JsonAccessor(accessor);
      initializer(accessor);
    }

    return new JsonAccessor(accessor, { immutable });
  }

  /**
   * Return the underlying value of the accessor.
   */
  unwrap(): unknown {
    return safeParse(JSON.stringify(this.#value));
  }

  /**
   * Alias for the `unwrap` method.
   */
  toJSON(): unknown {
    return this.unwrap();
  }

  /**
   * Delegates the `valueOf` method to the underlying value.
   */
  valueOf(): Object {
    return Object.prototype.valueOf.call(this.unwrap());
  }

  /**
   * Return a JSON string of the `value` property of this object.
   *
   * Equivalent to `JSON.stringify(this, null, <space>) ?? ''`.
   */
  toString(space?: string | number): string {
    return JSON.stringify(this.#value, null, space) ?? '';
  }

  /**
   * Parse the given JSON string and return a new JSON accessor for the
   * parsed value. This will never throw an error, and will always return
   * a new accessor instance. If the JSON string was invalid, the accessor's
   * underlying value will be `undefined`, and the `.exists()` method will
   * return false.
   */
  static parse(jsonData: string | undefined | null, options?: { readonly immutable?: boolean }): JsonAccessor {
    return new JsonAccessor(safeParse(jsonData), options);
  }
}

const safeParse = (value: string | null | undefined): JsonValue | undefined => {
  if (typeof value !== 'string') return undefined;

  try {
    return JSON.parse(value);
  }
  catch {
    return undefined;
  }
};
