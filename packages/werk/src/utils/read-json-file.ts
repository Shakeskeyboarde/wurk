import { readFile } from 'node:fs/promises';

export const readJsonFile = async <T>(filename: string, parse?: (json: unknown) => T): Promise<T> => {
  const json = await readFile(filename, 'utf8').then((text): unknown => JSON.parse(text, parse));
  if (json === undefined) throw new Error(`No valid JSON found (${filename})`);
  return parse ? parse(json) : (json as T);
};
