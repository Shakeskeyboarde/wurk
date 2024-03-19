import nodeOs from 'node:os';

import { JsonAccessor } from '@wurk/json';

export interface ConfigFilter {
  readonly type: 'include' | 'exclude';
  readonly expression: string;
}

export class Config {
  get filters(): readonly ConfigFilter[] {
    return JsonAccessor.parse(process.env.WURK_WORKSPACE_FILTERS)
      .as('array', [] as unknown[])
      .filter(isFilter);
  }

  set filters(value: readonly ConfigFilter[]) {
    process.env.WURK_WORKSPACE_FILTERS = JSON.stringify(value);
  }

  get parallel(): boolean {
    return JsonAccessor.parse(process.env.WURK_PARALLEL)
      .as('boolean', false);
  }

  set parallel(value: boolean) {
    process.env.WURK_PARALLEL = JSON.stringify(value);
  }

  get stream(): boolean {
    return JsonAccessor.parse(process.env.WURK_STREAM)
      .as('boolean', false);
  }

  set stream(value: boolean) {
    process.env.WURK_STREAM = JSON.stringify(value);
  }

  get concurrency(): number {
    return JsonAccessor.parse(process.env.WURK_CONCURRENCY)
      .as('number', () => nodeOs.cpus().length + 1);
  }

  set concurrency(value: number) {
    process.env.WURK_CONCURRENCY = JSON.stringify(value);
  }

  get delaySeconds(): number {
    return JsonAccessor.parse(process.env.WURK_DELAY_SECONDS)
      .as('number', 0);
  }

  set delaySeconds(value: number) {
    process.env.WURK_DELAY_SECONDS = JSON.stringify(value);
  }
}

export const isFilter = (value: unknown): value is ConfigFilter => {
  if (typeof value !== 'object') return false;
  if (value == null) return false;
  if (!('type' in value)) return false;
  if (value.type !== 'include' && value.type !== 'exclude') return false;
  if (!('expression' in value)) return false;
  if (typeof value.expression !== 'string') return false;

  return true;
};
