/* eslint-disable @typescript-eslint/consistent-type-imports */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { importRelative } from '@werk/cli';
import { type ConfigEnv, type LibraryFormats, type UserConfig } from 'vite';

interface Plugins {
  '@vitejs/plugin-react': typeof import('@vitejs/plugin-react') | undefined;
  'vite-plugin-dts': typeof import('vite-plugin-dts') | undefined;
  'vite-plugin-refresh': typeof import('vite-plugin-refresh') | undefined;
  'vite-plugin-svgr': typeof import('vite-plugin-svgr') | undefined;
}

export interface ViteConfigOptions {
  /**
   * Empty the output directory before building. Defaults to true.
   */
  emptyOutDir?: boolean;
  /**
   * True or an options object to enable library mode.
   */
  lib?: {
    /**
     * Entry file for the library. Defaults to `"src/index.ts"`
     */
    entry?: string;
    /**
     * Library formats (eg. "es", "cjs") to build. Defaults to
     * `["es", "cjs"]`.
     */
    formats?: LibraryFormats[];
    /**
     * Preserve modules directory structure (ie. disable bundling).
     * Defaults to true.
     */
    preserveModules?: boolean;
  };
}

const readPackage = async (dir = process.cwd()): Promise<Record<string, any>> => {
  return await readFile(join(dir, 'package.json'), 'utf8')
    .then(JSON.parse)
    .catch(() => {
      const parent = dirname(dir);
      return parent === dir ? undefined : readPackage(parent);
    });
};

const tryGetViteConfigPlugin = async <TName extends keyof Plugins>(
  name: TName,
  dir = process.cwd(),
): Promise<Record<TName, Plugins[TName]>> => {
  try {
    const { exports } = await importRelative(name, { dir });
    return { [name]: exports } as Record<TName, Plugins[TName]>;
  } catch (error) {
    return { [name]: undefined } as Record<TName, Plugins[TName]>;
  }
};

export const getViteConfigPlugins = async (dir = process.cwd()): Promise<Plugins> => {
  return {
    ...(await tryGetViteConfigPlugin('@vitejs/plugin-react', dir)),
    ...(await tryGetViteConfigPlugin('vite-plugin-dts', dir)),
    ...(await tryGetViteConfigPlugin('vite-plugin-refresh', dir)),
    ...(await tryGetViteConfigPlugin('vite-plugin-svgr', dir)),
  };
};

export const getViteConfig = async (
  env: ConfigEnv,
  { emptyOutDir = true, lib }: ViteConfigOptions = {},
): Promise<UserConfig> => {
  const plugins = await getViteConfigPlugins();

  if (lib) {
    const { entry = 'src/index.ts', formats = [], preserveModules = true } = lib;
    const entryRoot = dirname(entry);

    const external: (string | RegExp)[] = [/^node:/u];
    const packageJson = await readPackage();
    const dependencyNames = Object.keys({
      ...packageJson.dependencies,
      ...packageJson.peerDependencies,
      ...packageJson.optionalDependencies,
      ...packageJson.devDependencies,
    });

    if (dependencyNames.length) {
      external.push(new RegExp(`^(?:${dependencyNames.join('|')})(?:/|$)`, 'u'));
    }

    return {
      plugins: [
        plugins['vite-plugin-svgr']?.default({ exportAsDefault: true }),
        plugins['@vitejs/plugin-react']?.default(),
        plugins['vite-plugin-dts']?.default({
          root: process.cwd(),
          entryRoot,
          include: [entryRoot],
          exclude: ['**/*.test.*'],
        }),
      ],
      build: {
        outDir: 'lib',
        emptyOutDir,
        sourcemap: true,
        lib: {
          entry,
          formats,
          fileName: '[name]',
        },
        rollupOptions: {
          external,
          output: { preserveModules },
        },
      },
    };
  }

  return {
    plugins: [
      plugins['vite-plugin-svgr']?.default({ exportAsDefault: true }),
      plugins['@vitejs/plugin-react']?.default(),
      plugins['vite-plugin-refresh']?.default(),
    ],
    build: {
      outDir: 'dist',
      emptyOutDir,
    },
  };
};
