import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { JsonAccessor } from '@wurk/json';

import { getNpmRoot, type NpmQueryResult } from './npm.js';

export type Config = {
  readonly version: string | undefined;
  readonly description: string | undefined;
  readonly npmRoot: NpmQueryResult;
};

export const getConfig = async (): Promise<Config> => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const [config, npmRoot] = await Promise.all([
    readFile(resolve(__dirname, '../package.json'), 'utf-8').then(JsonAccessor.parse),
    getNpmRoot(),
  ]);

  return {
    version: config.at('version').as('string'),
    description: config.at('description').as('string'),
    npmRoot: npmRoot,
  };
};
