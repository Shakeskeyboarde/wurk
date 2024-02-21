import { importRelative } from '@wurk/import';

import { getVersionRange } from '../get-version.js';

type Exports = typeof import('vite-plugin-dts');

interface Options {
  format: 'es' | 'cjs';
}

export default async ({ format }: Options) => {
  const { default: ts } = await import('typescript');
  const { moduleExports } = await importRelative<Exports>('vite-plugin-dts', {
    versionRange: getVersionRange('vite-plugin-dts'),
  });
  const { default: plugin } = moduleExports;

  return plugin({
    entryRoot: 'src',
    compilerOptions:
      format === 'cjs'
        ? {
            module: ts.ModuleKind.CommonJS,
            moduleResolution: ts.ModuleResolutionKind.Node10,
          }
        : {
            module: ts.ModuleKind.ESNext,
            moduleResolution: ts.ModuleResolutionKind.Bundler,
          },
    copyDtsFiles: true,
    include: ['src'],
    exclude: ['**/*.test.*', '**/*.spec.*', '**/*.stories.*'],
  });
};
