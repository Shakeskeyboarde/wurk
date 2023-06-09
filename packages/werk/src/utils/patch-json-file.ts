import { merge } from './merge.js';
import { readJsonFile } from './read-json-file.js';
import { writeJsonFile } from './write-json-file.js';

export const patchJsonFile = async (filename: string, patch: unknown): Promise<void> => {
  const json = await readJsonFile(filename);
  const merged = merge(json, patch);
  await writeJsonFile(filename, merged);
};
