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
  'vite-plugin-bin': typeof import('vite-plugin-bin');
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
    entry?: string | string[];
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
  /**
   * Optional plugins can be forcibly disabled by adding their package
   * name with a value of false.
   */
  plugins?: Partial<Record<keyof Plugins, boolean>>;
}

const readPackage = async (dir = process.cwd()): Promise<Record<string, any>> => {
  return await readFile(join(dir, 'package.json'), 'utf8')
    .then(JSON.parse)
    .catch(() => {
      const parent = dirname(dir);
      return parent === dir ? undefined : readPackage(parent);
    });
};

export const getViteConfig = async (
  env: ConfigEnv,
  { emptyOutDir = true, lib, plugins }: ViteConfigOptions = {},
): Promise<UserConfig> => {
  // eslint-disable-next-line import/no-extraneous-dependencies
  const [vite, packageJson] = await Promise.all([import('vite'), readPackage()]);
  const logger = vite.createLogger();

  const tryPlugin = async <TName extends keyof Plugins>(
    name: TName,
    ...args: Parameters<Plugins[TName]['default']>
  ): Promise<ReturnType<Plugins[TName]['default']> | undefined> => {
    if (plugins?.[name] === false || !packageJson?.devDependencies?.[name]) return undefined;

    try {
      const { exports } = await importRelative<Plugins[TName]>(name);
      logger.info(`vite using optional plugin "${name}".`);
      const plugin: any = exports.default(...(args as any));
      return plugin;
    } catch (error) {
      return undefined;
    }
  };

  if (lib) {
    const { entry = 'src/index.ts', formats = [], preserveModules = true } = lib;

    logger.info(`vite library mode (${preserveModules ? 'preserving modules' : 'bundling'}).`);

    const external: RegExp[] = [/^node:/u];
    const dependencyNames = Object.keys({
      ...packageJson.dependencies,
      ...packageJson.peerDependencies,
      ...packageJson.optionalDependencies,
      ...(preserveModules ? packageJson.devDependencies : undefined),
    });

    if (dependencyNames.length) {
      external.push(new RegExp(`^(?:${dependencyNames.join('|')})(?:/|$)`, 'u'));
    }

    return {
      plugins: [
        tryPlugin('vite-plugin-svgr', { exportAsDefault: true, svgrOptions: { exportType: 'default' } } as any),
        tryPlugin('@vitejs/plugin-react'),
        tryPlugin('vite-plugin-dts', {
          entryRoot: 'src',
          copyDtsFiles: true,
          include: ['src'],
          exclude: ['**/*.test.*', '**/*.spec.*', '**/*.stories.*'],
        }),
        tryPlugin('vite-plugin-bin'),
      ],
      build: {
        target: 'esnext',
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

  logger.info('vite app mode.');

  return {
    plugins: [
      tryPlugin('vite-plugin-svgr', { exportAsDefault: true, svgrOptions: { exportType: 'default' } } as any),
      tryPlugin('@vitejs/plugin-react'),
      tryPlugin('vite-plugin-refresh'),
    ],
    build: {
      target: 'esnext',
      outDir: 'dist',
      emptyOutDir,
    },
  };
};
