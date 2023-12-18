import { importRelative } from '@werk/cli';

import { getVersion } from '../get-version.js';

type Exports = typeof import('vite-plugin-svgr');

export default async () => {
  const { exports } = await importRelative<Exports>('vite-plugin-svgr', { version: getVersion('vite-plugin-svgr') });
  const { default: plugin } = exports;

  return plugin();
};
