import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

import { JsonAccessor } from '@wurk/json';

import { getNpmRoot, type NpmQueryResult } from './npm.js';

export type Config = {
  readonly version: string | undefined;
  readonly description: string | undefined;
  readonly npmRoot: NpmQueryResult;
};

export const getConfig = async (): Promise<Config> => {
  const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
  const [config, npmRoot] = await Promise.all([
    fs.promises.readFile(path.resolve(__dirname, '../package.json'), 'utf-8').then(JsonAccessor.parse),
    getNpmRoot(),
  ]);

  return {
    version: config.at('version').as('string'),
    description: config.at('description').as('string'),
    npmRoot: npmRoot,
  };
};
