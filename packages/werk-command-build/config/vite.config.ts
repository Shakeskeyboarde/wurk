import assert from 'node:assert';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { type PackageJson } from '@werk/cli';
import { type RollupOptions } from 'rollup';
import { defineConfig, type LibraryOptions, type PluginOption } from 'vite';

export default defineConfig(async () => {
  const [packageJson, react, reload, dts, nodeExternals] = await Promise.all([
    readFile('package.json', 'utf-8').then((json) => JSON.parse(json) as PackageJson),
    import('@vitejs/plugin-react').then((exports) => exports.default.default ?? exports.default).catch(() => undefined),
    import('vite-plugin-full-reload').then((exports) => exports.default).catch(() => undefined),
    import('vite-plugin-dts').then((exports) => exports.default).catch(() => undefined),
    import('rollup-plugin-node-externals').then((exports) => exports.default).catch(() => undefined),
  ]);

  const plugins: PluginOption[] = [];

  let lib: LibraryOptions | false = false;
  let rollupOptions: RollupOptions | false = false;

  // Use library mode if there is a `main` field in `package.json`.
  if (packageJson?.main) {
    const entry = await Promise.all(
      ['tsx', 'ts', 'jsx', 'js'].map(async (ext) => {
        const filename = resolve('src', `index.${ext}`);
        const stats = await stat(filename).catch(() => undefined);
        return stats?.isFile() ? filename : undefined;
      }),
    ).then((entries) => entries.find((filename): filename is string => Boolean(filename)));

    assert(entry, 'Vite entry file not found.');

    lib = {
      entry,
      formats: ['es', 'cjs'],
      fileName: (format) => resolve('lib', format === 'es' || format === 'esm' ? 'esm' : 'cjs', 'index.js'),
    };

    rollupOptions = {
      plugins: [nodeExternals?.()],
    };

    plugins.push(dts?.());
  }

  return {
    plugins: [reload?.('**'), react?.(), ...plugins],
    server: { hmr: !reload },
    build: { outDir: 'dist' },
    lib,
    rollupOptions,
  };
});
