import assert from 'node:assert';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { Log } from '@werk/cli';
import { isCommonJsEntry, isEsmEntry } from '@werk/command-build';
import { defineConfig, type LibraryFormats, type UserConfig } from 'vite';

export default defineConfig(async (): Promise<UserConfig> => {
  const log = new Log();
  const [packageJson, tsConfigJson, reload, svgr, react, dts] = await Promise.all([
    readFile('package.json', 'utf-8').then((json) => JSON.parse(json)),
    readFile('tsconfig.json', 'utf-8')
      .then((json) => JSON.parse(json))
      .catch(() => undefined),
    import('vite-plugin-full-reload').then((exports) => exports.default).catch(() => undefined),
    import('vite-plugin-svgr').then((exports) => exports.default).catch(() => undefined),
    import('@vitejs/plugin-react').then((exports) => exports.default.default ?? exports.default).catch(() => undefined),
    import('vite-plugin-dts').then((exports) => exports.default).catch(() => undefined),
  ]);

  if (!react) log.warn('WARNING: Installing "@vitejs/plugin-react" is recommended.');
  if (!dts) log.warn('WARNING: Installing "vite-plugin-dts" is recommended.');
  if (!reload) log.warn('WARNING: Installing "vite-plugin-full-reload" is recommended.');
  if (!svgr) log.warn('WARNING: Installing "vite-plugin-svgr" is recommended.');

  const config: UserConfig & Required<Pick<UserConfig, 'plugins' | 'server' | 'build'>> = {
    plugins: [reload?.('**'), svgr?.({ exportAsDefault: true }), react?.()],
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

    const external: (string | RegExp)[] = [/^node:/u];
    const externalPackages = Object.keys({
      ...packageJson.dependencies,
      ...packageJson.peerDependencies,
      ...packageJson.optionalDependencies,
      ...packageJson.devDependencies,
    });

    if (externalPackages.length) {
      external.push(new RegExp(`^(?:${externalPackages.join('|')})(?:/|$)`, 'u'));
    }

    config.build.sourcemap = true;
    config.build.outDir = 'lib';
    config.build.emptyOutDir = false;
    config.build.lib = { entry, formats, fileName: '[name]' };
    config.build.rollupOptions = { external, output: { preserveModules: true } };
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
