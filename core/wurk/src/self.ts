import nodeFs from 'node:fs/promises';
import nodePath from 'node:path';
import nodeUrl from 'node:url';

import { JsonAccessor } from '@wurk/json';

/**
 * Wurk package information.
 */
export const getSelf = async (): Promise<{ readonly version: string; readonly description: string }> => {
  const __dirname = nodePath.dirname(nodeUrl.fileURLToPath(import.meta.url));
  const configFilename = nodePath.join(__dirname, '../package.json');
  const config = await nodeFs.readFile(configFilename, 'utf8')
    .then(JsonAccessor.parse);
  const version = config
    .at('version')
    .as('string')!;
  const description = config
    .at('description')
    .as('string')!;

  return { version, description };
};
