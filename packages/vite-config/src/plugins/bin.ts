import { importRelative } from '@werk/cli';

import { getVersion } from '../get-version.js';

type Exports = typeof import('vite-plugin-bin');

export default async () => {
  const { exports } = await importRelative<Exports>('vite-plugin-bin', { version: getVersion('vite-plugin-bin') });
  const { default: plugin } = exports;

  return plugin();
};
