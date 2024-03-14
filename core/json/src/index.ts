export interface JsonAccessorParent {
  readonly accessor: JsonAccessor;
  readonly key: string | number;
}

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

export class JsonAccessor {
  readonly parent: JsonAccessorParent | undefined;
  readonly immutable: boolean;

  #value: JsonValue | undefined;
  #isModified = false;

  get isModified(): boolean {
    return this.#isModified;
  }

  constructor(value?: unknown, options?: { readonly parent?: JsonAccessorParent; readonly immutable?: boolean }) {
    this.#value = safeParse(JSON.stringify(value));
    this.parent = options?.parent;
    this.immutable = options?.immutable ?? false;
  }

  /**
   * Return a new accessor for the value at the given key of the current
   * accessor.
   *
   * NOTE: This always returns a _new_ accessor, so the `isModified` state
   * will _not_ be shared with any previous accessors at the same key.
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

  is(types: JsonType | [JsonType, ...JsonType[]] | ((value: unknown) => boolean)): boolean {
    return (
      this.as(types as
      | JsonType
      | [JsonType, ...JsonType[]]
      | ((value: unknown) => value is unknown)) !== undefined
    );
  }

  exists(): boolean {
    return this.#value !== undefined;
  }

  keys(): number[] | string[];
  keys(type: 'array'): number[];
  keys(type: 'object'): string[];
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

  entries(): [number | string, unknown][];
  entries(type: 'array'): [number, unknown][];
  entries(type: 'object'): [string, unknown][];
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

  map<TValue>(callback: (value: JsonAccessor, index: number) => TValue): TValue[] | undefined {
    return this.as('array')
      ?.map((value, index) => callback(new JsonAccessor(value), index));
  }

  compose<TValue>(callback: (self: JsonAccessor) => TValue): TValue {
    return callback(this);
  }

  set(factory: (self: JsonAccessor) => unknown): void;
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

  unwrap(): unknown {
    return safeParse(JSON.stringify(this.#value));
  }

  /**
   * Alias for the `unwrap` method.
   */
  toJSON(): unknown {
    return this.unwrap();
  }

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
