/* eslint-disable max-lines */
import fs from 'node:fs';
import { isBuiltin } from 'node:module';
import { relative, resolve } from 'node:path';

import type { BuildOptions, LibraryFormats, LibraryOptions, UserConfig } from 'vite';

import { findWorkspaceDir } from './find-workspace-dir.js';
import { logger } from './logger.js';

export type PluginName =
  | 'vite-plugin-bin'
  | 'vite-plugin-checker'
  | 'vite-plugin-dts'
  | '@vitejs/plugin-react'
  | 'vite-plugin-refresh'
  | 'vite-plugin-rewrite-all'
  | 'vite-plugin-svgr'
  | 'vite-plugin-zip-pack';

export type LibraryFormat = Extract<LibraryFormats, 'es' | 'cjs'>;

export interface WerkConfigOptions {
  /**
   * Output directory for build. Defaults to "dist".
   */
  outDir?: string;
  /**
   * Empty the output directory before building. Defaults to true.
   */
  emptyOutDir?: boolean;
  /**
   * True or an options object to enable library mode.
   */
  lib?: {
    /**
     * Entry files for the library. Defaults to `["src/index.ts"]`
     */
    entries?: string[];
    /**
     * Library format (ie. "es", "cjs") to build. Defaults to 'es'.
     */
    format?: LibraryFormat;
    /**
     * Preserve modules directory structure (ie. disable bundling).
     * Defaults to true.
     */
    preserveModules?: boolean;
  };
  /**
   * If a plugin is added to this list, it will not be used even if it is
   * installed as a workspace dependency.
   */
  disablePlugins?: PluginName[];
}

const plugins = {
  'vite-plugin-bin': import('./plugins/bin.js'),
  'vite-plugin-checker': import('./plugins/checker.js'),
  'vite-plugin-dts': import('./plugins/dts.js'),
  '@vitejs/plugin-react': import('./plugins/react.js'),
  'vite-plugin-refresh': import('./plugins/refresh.js'),
  'vite-plugin-rewrite-all': import('./plugins/rewrite-all.js'),
  'vite-plugin-svgr': import('./plugins/svgr.js'),
  'vite-plugin-zip-pack': import('./plugins/zip-pack.js'),
} as const satisfies Record<PluginName, any>;

await Promise.all(Object.values(plugins));

export type WerkUserConfig = UserConfig & {
  root: string;
  plugins: Extract<UserConfig['plugins'], any[]>;
  build: BuildOptions &
    Required<Pick<BuildOptions, 'outDir' | 'rollupOptions'>> & {
      target: 'esnext';
      lib?: LibraryOptions & {
        entry: [string, ...string[]];
        formats: [LibraryFormat];
        fileName: string;
      };
    };
};

/**
 * Define the Vite config used by the Werk build command.
 *
 * The returned config is a narrower type than Vite's default `UserConfig`,
 * to allow for easier extension.
 */
export const defineWerkConfig = async (options: WerkConfigOptions = {}): Promise<WerkUserConfig> => {
  const { outDir = 'dist', emptyOutDir = true, lib, disablePlugins = [] } = options;
  const packageRoot = (await findWorkspaceDir()) ?? process.cwd();
  const packageJson = await fs.promises
    .readFile(resolve(packageRoot, 'package.json'), 'utf-8')
    .then(JSON.parse)
    .catch(() => null);

  const isPluginEnabled = (name: PluginName): boolean => {
    const isEnabled = !disablePlugins.includes(name) && Boolean(packageJson?.devDependencies?.[name]);

    if (isEnabled) {
      logger.info(`vite using optional plugin "${name}".`);
    }

    return isEnabled;
  };

  if (lib) {
    const { entries = [], format = 'es', preserveModules = true } = lib;
    const entry: [string, ...string[]] =
      entries.length === 0 ? [resolve(packageRoot, 'src/index.ts')] : (entries as [string, ...string[]]);

    logger.info(
      `vite library mode (${preserveModules ? 'preserving modules' : 'bundling'}).${entry.reduce(
        (acc, value) => `${acc}\n  - ${relative(packageRoot, value)}`,
        '',
      )}`,
    );

    const externalIds = Object.keys({
      ...packageJson?.dependencies,
      ...packageJson?.peerDependencies,
      ...packageJson?.optionalDependencies,
      ...(preserveModules ? packageJson?.devDependencies : undefined),
    });

    return {
      root: packageRoot,
      plugins: [
        isPluginEnabled('vite-plugin-checker') && (await plugins['vite-plugin-checker']).default(),
        isPluginEnabled('vite-plugin-svgr') && (await plugins['vite-plugin-svgr']).default(),
        isPluginEnabled('@vitejs/plugin-react') && (await plugins['@vitejs/plugin-react']).default(),
        isPluginEnabled('vite-plugin-dts') &&
          (format === 'es' || format === 'cjs') &&
          (await plugins['vite-plugin-dts']).default({ format }),
        isPluginEnabled('vite-plugin-bin') && (await plugins['vite-plugin-bin']).default(),
        isPluginEnabled('vite-plugin-zip-pack') && (await plugins['vite-plugin-zip-pack']).default({ inDir: outDir }),
      ],
      build: {
        target: 'esnext',
        outDir,
        emptyOutDir,
        sourcemap: true,
        lib: {
          entry,
          formats: [format],
          fileName: '[name]',
        },
        rollupOptions: {
          output: { preserveModules },
          external: (id) => {
            return isBuiltin(id) || externalIds.some((xid) => id === xid || id.startsWith(`${xid}/`));
          },
          // See: https://github.com/vitejs/vite-plugin-react/issues/137
          onwarn: (warning, warn) => {
            if (warning.code !== 'MODULE_LEVEL_DIRECTIVE') warn(warning);
          },
        },
      },
    };
  }

  logger.info('vite app mode.');

  return {
    root: packageRoot,
    plugins: [
      isPluginEnabled('vite-plugin-checker') && (await plugins['vite-plugin-checker']).default(),
      isPluginEnabled('vite-plugin-svgr') && (await plugins['vite-plugin-svgr']).default(),
      isPluginEnabled('@vitejs/plugin-react') && (await plugins['@vitejs/plugin-react']).default(),
      isPluginEnabled('vite-plugin-refresh') && (await plugins['vite-plugin-refresh']).default(),
      isPluginEnabled('vite-plugin-rewrite-all') && (await plugins['vite-plugin-rewrite-all']).default(),
      isPluginEnabled('vite-plugin-zip-pack') && (await plugins['vite-plugin-zip-pack']).default({ inDir: outDir }),
    ],
    build: {
      target: 'esnext',
      outDir,
      emptyOutDir,
      rollupOptions: {
        // See: https://github.com/vitejs/vite-plugin-react/issues/137
        onwarn: (warning, warn) => {
          if (warning.code !== 'MODULE_LEVEL_DIRECTIVE') warn(warning);
        },
      },
    },
  };
};
