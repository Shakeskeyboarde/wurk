export interface ReadonlyEnhancedMap<K, V> extends ReadonlyMap<K, V> {
  map<TResult>(callback: (value: V, key: K, map: this) => TResult): TResult[];

  mapAsync<TResult>(callback: (value: V, key: K, map: this) => TResult | Promise<TResult>): Promise<TResult[]>;

  filter(callback: (value: V, key: K, map: this) => boolean): ReadonlyEnhancedMap<K, V>;

  filterAsync(
    callback: (value: V, key: K, map: this) => boolean | Promise<boolean>,
  ): Promise<ReadonlyEnhancedMap<K, V>>;
}

export class EnhancedMap<K, V> extends Map<K, V> implements ReadonlyEnhancedMap<K, V> {
  map<TResult>(callback: (value: V, key: K, map: this) => TResult): TResult[] {
    return Array.from(this.entries(), ([key, value]) => callback(value, key, this));
  }

  mapAsync<TResult>(callback: (value: V, key: K, map: this) => Promise<TResult>): Promise<TResult[]> {
    return Promise.all(this.map(callback));
  }

  filter(callback: (value: V, key: K, map: this) => boolean): EnhancedMap<K, V> {
    return new EnhancedMap(Array.from(this.entries()).filter(([key, value]) => callback(value, key, this)));
  }

  async filterAsync(callback: (value: V, key: K, map: this) => boolean | Promise<boolean>): Promise<EnhancedMap<K, V>> {
    return await this.mapAsync(
      async (value, key) => [key, (await callback(value, key, this)) ? value : undefined] as const,
    ).then((entries) => {
      return new EnhancedMap(entries.filter((entry): entry is [K, V] => Boolean(entry[1])));
    });
  }
}
