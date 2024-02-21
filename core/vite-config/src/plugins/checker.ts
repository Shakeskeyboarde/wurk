import { importRelative } from '@wurk/import';

import { findTsConfigDir } from '../find-ts-config-dir.js';
import { getVersionRange } from '../get-version.js';
import { logger } from '../logger.js';

type Exports = typeof import('vite-plugin-checker');

export default async () => {
  const [tsRoot] = await Promise.all([findTsConfigDir()]);
  const { moduleExports } = await importRelative<Exports>('vite-plugin-checker', {
    versionRange: getVersionRange('vite-plugin-checker'),
  });
  const { default: plugin } = moduleExports;
  const isTypescript = await importRelative('typescript')
    .then(() => true)
    .catch(() => false);

  if (isTypescript && !tsRoot) {
    logger.warn('vite-plugin-checker requires a tsconfig.json file for Typescript checking');
    return null;
  }

  return plugin({
    typescript: isTypescript && tsRoot ? { root: tsRoot } : false,
  });
};
