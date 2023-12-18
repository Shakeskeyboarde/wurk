import fs from 'node:fs';
import path from 'node:path';

import { findUp } from './find-up.js';

export const findWorkspaceDir = async (): Promise<string | null> => {
  return await findUp((dir) =>
    fs.promises
      .stat(path.join(dir, 'package.json'))
      .then((stat) => stat.isFile())
      .catch(() => false),
  );
};
