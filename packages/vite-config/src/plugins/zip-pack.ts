import { importRelative } from '@werk/cli';

import { getVersion } from '../get-version.js';

type Exports = typeof import('vite-plugin-zip-pack');

interface Options {
  inDir: string;
}

export default async ({ inDir }: Options) => {
  const { exports } = await importRelative<Exports>('vite-plugin-zip-pack', {
    version: getVersion('vite-plugin-zip-pack'),
  });
  const { default: plugin } = exports;

  return await plugin({
    inDir,
    outDir: 'out',
    outFileName: `${inDir.replace(/^[\\/]+|[\\/]+$/gu, '').replace(/[\\/:]+/gu, '-')}.zip`,
  });
};
