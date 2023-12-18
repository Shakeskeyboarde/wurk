import { importRelative } from '@werk/cli';

import { getVersion } from '../get-version.js';

type Exports = typeof import('vite-plugin-refresh');

export default async () => {
  const { exports } = await importRelative<Exports>('vite-plugin-refresh', {
    version: getVersion('vite-plugin-refresh'),
  });
  const { default: plugin } = exports;

  return plugin();
};
