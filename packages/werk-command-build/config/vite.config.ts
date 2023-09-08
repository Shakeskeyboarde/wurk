import assert from 'node:assert';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { defineConfig, type LibraryFormats, type UserConfig } from 'vite';

import { isCommonJsEntry, isEsmEntry } from '../src/util.js';

export default defineConfig(async (): Promise<UserConfig> => {
  const [packageJson, tsConfigJson, react, reload, dts] = await Promise.all([
    readFile('package.json', 'utf-8').then((json) => JSON.parse(json)),
    readFile('tsconfig.json', 'utf-8')
      .then((json) => JSON.parse(json))
      .catch(() => undefined),
    import('@vitejs/plugin-react').then((exports) => exports.default.default ?? exports.default).catch(() => undefined),
    import('vite-plugin-full-reload').then((exports) => exports.default).catch(() => undefined),
    import('vite-plugin-dts').then((exports) => exports.default).catch(() => undefined),
  ]);

  const config: UserConfig & Required<Pick<UserConfig, 'plugins' | 'server' | 'build'>> = {
    plugins: [reload?.('**'), react?.()],
    server: { hmr: !reload },
    build: { outDir: 'dist' },
  };
  const isEsm = isEsmEntry(packageJson);
  const isCommonJs = isCommonJsEntry(packageJson);
  const isLib = isEsm || isCommonJs;

  if (isLib) {
    const entry = await Promise.all(
      ['tsx', 'ts', 'jsx', 'js'].map(async (ext) => {
        const filename = resolve('src', `index.${ext}`);
        const stats = await stat(filename).catch(() => undefined);
        return stats?.isFile() ? filename : undefined;
      }),
    ).then((entries) => entries.find((filename): filename is string => Boolean(filename)));

    assert(entry, 'Vite entry file not found.');

    const formats: LibraryFormats[] = [];

    if (isEsm) formats.push('es');
    if (isCommonJs) formats.push('cjs');

    config.build.sourcemap = true;
    config.build.outDir = 'lib';
    config.build.lib = { entry, formats, fileName: '[name]' };
    config.build.rollupOptions = {
      external: [
        /^node:/u,
        ...Object.keys({
          ...packageJson.dependencies,
          ...packageJson.peerDependencies,
          ...packageJson.optionalDependencies,
        }),
      ],
      output: { preserveModules: true },
    };
    config.plugins.push(
      dts?.({
        root: process.cwd(),
        entryRoot: 'src',
        compilerOptions: { rootDir: tsConfigJson?.compilerOptions?.rootDir ?? 'src' },
        include: tsConfigJson?.include ?? ['src'],
        exclude: tsConfigJson?.exclude ?? ['**/*.test.*'],
      }),
    );
  }

  return config;
});
