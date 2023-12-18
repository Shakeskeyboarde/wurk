import fs from 'node:fs';
import path from 'node:path';

import { findUp } from './find-up.js';

export const findTsConfigDir = async (): Promise<string | null> => {
  return await findUp((dir) =>
    fs.promises
      .stat(path.join(dir, 'tsconfig.json'))
      .then((stats) => stats.isFile())
      .catch(() => false),
  );
};
