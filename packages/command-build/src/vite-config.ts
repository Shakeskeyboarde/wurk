/* eslint-disable @typescript-eslint/consistent-type-imports */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { importRelative } from '@werk/cli';
import { type ConfigEnv, type LibraryFormats, type UserConfig } from 'vite';

interface Plugins {
  '@vitejs/plugin-react': typeof import('@vitejs/plugin-react');
  'vite-plugin-dts': typeof import('vite-plugin-dts');
  'vite-plugin-refresh': typeof import('vite-plugin-refresh');
  'vite-plugin-svgr': typeof import('vite-plugin-svgr');
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

const tryPlugin = async <TName extends keyof Plugins>(
  name: TName,
  ...args: Parameters<Plugins[TName]['default']>
): Promise<ReturnType<Plugins[TName]['default']> | undefined> => {
  try {
    const { exports } = await importRelative<Plugins[TName]>(name);
    console.log(`vite using optional plugin "${name}".`);
    const plugin = exports.default(...(args as any)) as any;
    return plugin;
  } catch (error) {
    return undefined;
  }
};

export const getViteConfig = async (
  env: ConfigEnv,
  { emptyOutDir = true, lib }: ViteConfigOptions = {},
): Promise<UserConfig> => {
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
        tryPlugin('vite-plugin-svgr', { exportAsDefault: true }),
        tryPlugin('@vitejs/plugin-react'),
        tryPlugin('vite-plugin-dts', {
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
      tryPlugin('vite-plugin-svgr', { exportAsDefault: true }),
      tryPlugin('@vitejs/plugin-react'),
      tryPlugin('vite-plugin-refresh'),
    ],
    build: {
      outDir: 'dist',
      emptyOutDir,
    },
  };
};
