import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { type PackageJson } from './package-json.js';

export const readPackageInfo = async (
  pathname: string,
): Promise<{ packageJson: PackageJson; dir: string } | undefined> => {
  return await readFile(resolve(pathname, 'package.json'), { encoding: 'utf8' })
    .then((json) => {
      const packageJson = JSON.parse(json) as PackageJson;

      if (!packageJson.name) return 'continue' as const;

      return { packageJson, dir: pathname };
    })
    .catch((error: undefined | { code?: unknown }) => {
      if (error?.code === 'ENOENT') return 'continue' as const;

      throw error;
    })
    .then((result) => {
      if (result === 'continue') {
        const nextPathname = dirname(pathname);
        return nextPathname === pathname ? undefined : readPackageInfo(nextPathname);
      }

      return result;
    });
};
