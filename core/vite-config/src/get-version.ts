import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

import { JsonAccessor } from '@wurk/json';

import { findUp } from './find-up.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const dir = await findUp(
  (current) =>
    fs.promises
      .stat(path.join(current, 'package.json'))
      .then((stat) => stat.isFile())
      .catch(() => false),
  __dirname,
);

const config = dir
  ? await fs.promises.readFile(path.join(dir, 'package.json'), 'utf8').then(JsonAccessor.parse)
  : new JsonAccessor();

export const getVersionRange = (name: string): string | undefined => {
  const versionRange =
    config.at('dependencies').at(name).as('string') ??
    config.at('peerDependencies').at(name).as('string') ??
    config.at('optionalDependencies').at(name).as('string') ??
    config.at('devDependencies').at(name).as('string');

  if (versionRange == null) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`missing dependency "${name}" in own "package.json" file`);
    } else {
      console.warn(`missing dependency "${name}" in own "package.json" file`);
      return undefined;
    }
  }
};
