import { readFile, writeFile } from 'node:fs/promises';

import { type Draft, produce } from 'immer';

export type Patch<T> = (json: Draft<T>) => Draft<T> | void | undefined;

export const readJsonFile = async <T>(filename: string, parse?: (json: unknown) => T): Promise<T> => {
  const json = await readFile(filename, 'utf8').then((text): unknown => JSON.parse(text, parse));
  if (json === undefined) throw new Error(`No valid JSON found (${filename})`);
  return parse ? parse(json) : (json as T);
};

export const writeJsonFile = async <T>(filename: string, patch: Patch<T>): Promise<[patched: T, modified: boolean]> => {
  const base: T = await readJsonFile<T>(filename);
  const patched = produce(base, patch);
  const modified = patched !== base;

  if (modified) await writeFile(filename, JSON.stringify(patched, null, 2) + '\n');

  return [patched, modified];
};
