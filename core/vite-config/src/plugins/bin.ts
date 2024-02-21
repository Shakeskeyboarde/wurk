import { importRelative } from '@wurk/import';

import { getVersionRange } from '../get-version.js';

type Exports = typeof import('vite-plugin-bin');

export default async () => {
  const { moduleExports } = await importRelative<Exports>('vite-plugin-bin', {
    versionRange: getVersionRange('vite-plugin-bin'),
  });
  const { default: plugin } = moduleExports;

  return plugin();
};
