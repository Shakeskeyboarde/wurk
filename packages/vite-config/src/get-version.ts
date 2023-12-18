import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

import { findUp } from './find-up.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const packageRoot = await findUp(
  (dir) =>
    fs.promises
      .stat(path.join(dir, 'package.json'))
      .then((stat) => stat.isFile())
      .catch(() => false),
  __dirname,
);

const packageJson =
  packageRoot &&
  (await fs.promises
    .readFile(path.join(packageRoot, 'package.json'), 'utf8')
    .then(JSON.parse)
    .catch(() => undefined));

export const getVersion = (name: string): string | undefined => {
  const version = {
    ...packageJson?.devDependencies,
    ...packageJson?.dependencies,
    ...packageJson?.peerDependencies,
    ...packageJson?.optionalDependencies,
  }[name];

  if (typeof version !== 'string') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing dependency "${name}" in own "package.json" file.`);
    } else {
      console.warn(`Missing dependency "${name}" in own "package.json" file.`);
      return undefined;
    }
  }
};
