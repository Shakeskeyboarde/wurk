import { importRelative } from '@wurk/import';

import { getVersionRange } from '../get-version.js';

type Exports = typeof import('vite-plugin-svgr');

export default async () => {
  const { moduleExports } = await importRelative<Exports>('vite-plugin-svgr', {
    versionRange: getVersionRange('vite-plugin-svgr'),
  });
  const { default: plugin } = moduleExports;

  return plugin();
};
