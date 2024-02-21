import { importRelative } from '@wurk/import';

import { getVersionRange } from '../get-version.js';

type Exports = typeof import('vite-plugin-zip-pack');

interface Options {
  inDir: string;
}

export default async ({ inDir }: Options) => {
  const { moduleExports } = await importRelative<Exports>('vite-plugin-zip-pack', {
    versionRange: getVersionRange('vite-plugin-zip-pack'),
  });
  const { default: plugin } = moduleExports;

  return await plugin({
    inDir,
    outDir: 'out',
    outFileName: `${inDir.replace(/^[\\/]+|[\\/]+$/gu, '').replace(/[\\/:]+/gu, '-')}.zip`,
  });
};
