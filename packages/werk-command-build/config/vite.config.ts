import assert from 'node:assert';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { loadViteOptionalPlugins } from '@werk/command-build';
import { defineConfig, type LibraryFormats, mergeConfig, type UserConfig } from 'vite';

export default defineConfig(async (): Promise<UserConfig> => {
  const isEsmLib = Boolean(process.env.VITE_LIB_ESM);
  const isCjsLib = Boolean(process.env.VITE_LIB_CJS);
  const [packageJson, tsConfigJson, plugins] = await Promise.all([
    readFile('package.json', 'utf-8').then((json) => JSON.parse(json)),
    readFile('tsconfig.json', 'utf-8')
      .then((json) => JSON.parse(json))
      .catch(() => undefined),
    loadViteOptionalPlugins(),
  ]);
  const { react, dts, refresh, svgr } = plugins;

  const config: UserConfig = {
    plugins: [svgr?.({ exportAsDefault: true }), react?.()],
  };

  if (isEsmLib || isCjsLib) {
    const entry = await Promise.all(
      ['tsx', 'ts', 'jsx', 'js'].map(async (ext) => {
        const filename = resolve('src', `index.${ext}`);
        const stats = await stat(filename).catch(() => undefined);
        return stats?.isFile() ? filename : undefined;
      }),
    ).then((entries) => entries.find((filename): filename is string => Boolean(filename)));

    assert(entry, 'Vite entry file not found.');

    const formats: LibraryFormats[] = [];

    if (isEsmLib) formats.push('es');
    if (isCjsLib) formats.push('cjs');

    const external: (string | RegExp)[] = [/^node:/u];
    const dependencyNames = Object.keys({
      ...packageJson.dependencies,
      ...packageJson.peerDependencies,
      ...packageJson.optionalDependencies,
      ...packageJson.devDependencies,
    });

    if (dependencyNames.length) {
      external.push(new RegExp(`^(?:${dependencyNames.join('|')})(?:/|$)`, 'u'));
    }

    return mergeConfig(
      config,
      {
        plugins: [
          dts?.({
            root: process.cwd(),
            entryRoot: 'src',
            compilerOptions: { rootDir: tsConfigJson?.compilerOptions?.rootDir ?? 'src' },
            include: tsConfigJson?.include ?? ['src'],
            exclude: tsConfigJson?.exclude ?? ['**/*.test.*'],
          }),
        ],
        build: {
          sourcemap: true,
          outDir: 'lib',
          emptyOutDir: false,
          lib: {
            entry,
            formats,
            fileName: '[name]',
          },
          rollupOptions: {
            external,
            output: { preserveModules: true },
          },
        },
      } satisfies UserConfig,
      true,
    );
  }

  return mergeConfig(
    config,
    {
      plugins: [refresh?.()],
    },
    true,
  );
});
