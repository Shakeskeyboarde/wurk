import nodeOs from 'node:os';

import { JsonAccessor } from '@wurk/json';

/**
 * A single workspace filter definition.
 */
export interface ConfigFilter {
  /**
   * The filter type.
   */
  readonly type: 'include' | 'exclude';
  /**
   * The filter expression string.
   */
  readonly expression: string;
}

/**
 * Wurk environmental configuration accessor. This is a type-safe wrapper
 * around the `process.env` object.
 */
export class Config {
  /**
   * Get inherited workspace filters.
   */
  get filters(): readonly ConfigFilter[] {
    return JsonAccessor.parse(process.env.WURK_WORKSPACE_FILTERS)
      .as('array', [] as unknown[])
      .filter(isFilter);
  }

  /**
   * Set workspace filters to be inherited by child processes.
   */
  set filters(value: readonly ConfigFilter[]) {
    process.env.WURK_WORKSPACE_FILTERS = JSON.stringify(value);
  }

  /**
   * Get inherited workspace parallel option.
   */
  get parallel(): boolean {
    return JsonAccessor.parse(process.env.WURK_PARALLEL)
      .as('boolean', false);
  }

  /**
   * Set workspace parallel option to be inherited by child processes.
   */
  set parallel(value: boolean) {
    process.env.WURK_PARALLEL = JSON.stringify(value);
  }

  /**
   * Get inherited workspace stream option.
   */
  get stream(): boolean {
    return JsonAccessor.parse(process.env.WURK_STREAM)
      .as('boolean', false);
  }

  /**
   * Set workspace stream option to be inherited by child processes.
   */
  set stream(value: boolean) {
    process.env.WURK_STREAM = JSON.stringify(value);
  }

  /**
   * Get inherited workspace concurrency option.
   */
  get concurrency(): number {
    return JsonAccessor.parse(process.env.WURK_CONCURRENCY)
      .as('number', () => nodeOs.cpus().length + 1);
  }

  /**
   * Set workspace concurrency option to be inherited by child processes.
   */
  set concurrency(value: number) {
    process.env.WURK_CONCURRENCY = JSON.stringify(value);
  }

  /**
   * Get inherited workspace delay option.
   */
  get delaySeconds(): number {
    return JsonAccessor.parse(process.env.WURK_DELAY_SECONDS)
      .as('number', 0);
  }

  /**
   * Set workspace delay option to be inherited by child processes.
   */
  set delaySeconds(value: number) {
    process.env.WURK_DELAY_SECONDS = JSON.stringify(value);
  }
}

/**
 * Check if a value is a workspace filter definition.
 */
export const isFilter = (value: unknown): value is ConfigFilter => {
  if (typeof value !== 'object') return false;
  if (value == null) return false;
  if (!('type' in value)) return false;
  if (value.type !== 'include' && value.type !== 'exclude') return false;
  if (!('expression' in value)) return false;
  if (typeof value.expression !== 'string') return false;

  return true;
};
