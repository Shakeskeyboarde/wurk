import { readJsonFile } from './read-json-file.js';
import { writeJsonFile } from './write-json-file.js';

export const patchJsonFile = async <T>(filename: string, patch: (json: T) => T): Promise<void> => {
  const json = await readJsonFile<T>(filename);
  const patched = await patch(json);
  await writeJsonFile(filename, patched);
};
