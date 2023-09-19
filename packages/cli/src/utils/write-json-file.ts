import { writeFile } from 'node:fs/promises';

import { log } from './log.js';

export const writeJsonFile = async (filename: string, value: unknown): Promise<void> => {
  log.silly(`writeJsonFile('${filename}')`);
  await writeFile(filename, JSON.stringify(value, null, 2) + '\n');
};
