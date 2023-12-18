import { importRelative } from '@werk/cli';

import { getVersion } from '../get-version.js';

type Exports = typeof import('@vitejs/plugin-react');

export default async () => {
  const { exports } = await importRelative<Exports>('@vitejs/plugin-react', {
    version: getVersion('@vitejs/plugin-react'),
  });
  const { default: plugin } = exports;

  return plugin();
};
