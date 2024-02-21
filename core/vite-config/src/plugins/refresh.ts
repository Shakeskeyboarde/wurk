import { importRelative } from '@wurk/import';

import { getVersionRange } from '../get-version.js';

type Exports = typeof import('vite-plugin-refresh');

export default async () => {
  const { moduleExports } = await importRelative<Exports>('vite-plugin-refresh', {
    versionRange: getVersionRange('vite-plugin-refresh'),
  });
  const { default: plugin } = moduleExports;

  return plugin();
};
