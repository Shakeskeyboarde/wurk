import { importRelative } from '@wurk/import';

import { getVersionRange } from '../get-version.js';

type Exports = typeof import('@vitejs/plugin-react');

export default async () => {
  const { moduleExports } = await importRelative<Exports>('@vitejs/plugin-react', {
    versionRange: getVersionRange('@vitejs/plugin-react'),
  });
  const { default: plugin } = moduleExports;

  return plugin();
};
