export interface JsonAccessorParent {
  readonly accessor: JsonAccessor;
  readonly key: string | number;
}

export type JsonType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null';

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

  #value: JsonValue | undefined;
  #isModified = false;

  get value(): unknown {
    return this.#value;
  }

  get isModified(): boolean {
    return this.#isModified;
  }

  constructor(value?: unknown, parent?: JsonAccessorParent) {
    this.#value = value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    this.parent = parent;
  }

  /**
   * Return a new accessor for the value at the given key of the current
   * accessor.
   *
   * NOTE: This always returns a _new_ accessor, so the `isModified` state
   * will _not_ be shared with any previous accessors at the same key.
   */
  at(key: string | number): JsonAccessor {
    const value =
      typeof key === 'number'
        ? Array.isArray(this.#value)
          ? this.#value.at(key)
          : undefined
        : typeof this.#value === 'object' &&
            this.#value != null &&
            !Array.isArray(this.#value) &&
            Object.prototype.hasOwnProperty.call(this.#value, key)
          ? this.#value[key]
          : undefined;

    return new JsonAccessor(value, {
      accessor: this,
      key,
    });
  }

  as<TJsonType extends JsonType, TValue = JsonValue<TJsonType>>(
    types: TJsonType | [TJsonType, ...TJsonType[]] | ((value: unknown) => value is TValue),
  ): TValue | undefined;
  as<TJsonType extends JsonType, TValue = JsonValue<TJsonType>, TAltValue = undefined>(
    types: TJsonType | [TJsonType, ...TJsonType[]] | ((value: unknown) => value is TValue),
    alt: TAltValue,
  ): TValue | TAltValue;
  as<TJsonType extends JsonType, TValue = JsonValue<TJsonType>, TAltValue = undefined>(
    types: TJsonType | [TJsonType, ...TJsonType[]] | ((value: unknown) => value is TValue),
    alt: TAltValue = undefined as TAltValue,
  ): TValue | TAltValue {
    if (typeof types === 'function') {
      return types(this.#value) ? (this.#value as TValue) : alt;
    }

    for (const type of Array.isArray(types) ? types : [types]) {
      switch (type) {
        case 'null':
          if (this.#value === null) return this.#value as TValue;
          break;
        case 'array':
          if (Array.isArray(this.#value)) return this.#value as TValue;
          break;
        case 'object':
          if (typeof this.#value === 'object' && this.#value != null) return this.#value as TValue;
          break;
        default:
          if (typeof this.#value === type) return this.#value as TValue;
          break;
      }
    }

    return alt;
  }

  is(types: JsonType | [JsonType, ...JsonType[]] | ((value: unknown) => boolean)): boolean {
    return (
      this.as(types as JsonType | [JsonType, ...JsonType[]] | ((value: unknown) => value is unknown)) !== undefined
    );
  }

  exists(): boolean {
    return this.#value !== undefined;
  }

  keys(): number[] | string[];
  keys(mode: 'array'): number[];
  keys(mode: 'object'): string[];
  keys(mode?: 'array' | 'object'): number[] | string[];
  keys(mode?: 'array' | 'object'): number[] | string[] {
    return Array.isArray(this.#value)
      ? mode === 'array' || mode == null
        ? this.#value.map((_, i) => i)
        : []
      : (mode === 'object' || mode == null) && typeof this.#value === 'object' && this.#value != null
        ? Object.keys(this.#value)
        : [];
  }

  values(): unknown[] {
    return Array.isArray(this.#value)
      ? this.#value
      : typeof this.#value === 'object' && this.#value != null
        ? Object.values(this.#value)
        : [];
  }

  entries(): [number | string, unknown][];
  entries(mode: 'array'): [number, unknown][];
  entries(mode: 'object'): [string, unknown][];
  entries(mode?: 'array' | 'object'): [number | string, unknown][];
  entries(mode?: 'array' | 'object'): [number | string, unknown][] {
    return Array.isArray(this.#value)
      ? mode === 'array' || mode == null
        ? this.#value.map((value, i) => [i, value])
        : []
      : (mode === 'object' || mode == null) && typeof this.#value === 'object' && this.#value != null
        ? Object.entries(this.#value)
        : [];
  }

  map<TValue>(callback: (valueAccessor: JsonAccessor, index: number) => TValue): TValue[] | undefined {
    return this.as('array')?.map((value, index) => callback(new JsonAccessor(value), index));
  }

  compose<TValue>(callback: (self: JsonAccessor) => TValue): TValue {
    return callback(this);
  }

  set(factory: (self: JsonAccessor) => unknown): void;
  set(value: unknown): void;
  set(factoryOrValue: unknown): void {
    const value = typeof factoryOrValue === 'function' ? factoryOrValue(this) : factoryOrValue;
    const newValue = value === undefined ? undefined : JSON.parse(JSON.stringify(value));

    this.#isModified = newValue !== this.#value;
    this.#value = newValue;

    if (this.parent) {
      const { accessor, key } = this.parent;

      if (typeof key === 'number') {
        accessor.set(accessor.as('array', []).splice(key, 1, this.#value));
      } else {
        accessor.set(Object.assign(accessor.as('object', {}), { [key]: this.#value }));
      }
    }
  }

  copy(initializer?: (copy: JsonAccessor) => void): JsonAccessor {
    const copy = new JsonAccessor(this.#value);
    initializer?.(copy);
    return copy;
  }

  valueOf(): Object {
    return new Object(this.value);
  }

  toJSON(): unknown {
    return this.value;
  }

  toString(): string {
    return JSON.stringify(this, null, 2) ?? '';
  }

  static parse(jsonData: unknown): JsonAccessor {
    if (typeof jsonData !== 'string') return new JsonAccessor();

    try {
      return new JsonAccessor(JSON.parse(jsonData));
    } catch {
      return new JsonAccessor();
    }
  }
}
