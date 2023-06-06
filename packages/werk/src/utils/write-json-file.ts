import { writeFile } from 'node:fs/promises';

export const writeJsonFile = async (filename: string, value: unknown): Promise<void> => {
  await writeFile(filename, JSON.stringify(value, null, 2) + '\n');
};
