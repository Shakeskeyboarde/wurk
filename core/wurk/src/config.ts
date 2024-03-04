import path from 'node:path';
import url from 'node:url';

import { fs } from '@wurk/fs';

import { getNpmRoot } from './npm.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const config = await fs.readJson(path.join(__dirname, '../package.json'));

export const version = config.at('version').as('string');
export const description = config.at('description').as('string');
export const npmRoot = await getNpmRoot();
