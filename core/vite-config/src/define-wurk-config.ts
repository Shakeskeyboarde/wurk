import fs from 'node:fs';
import { isBuiltin } from 'node:module';
import { relative, resolve } from 'node:path';

import { JsonAccessor } from '@wurk/json';
import type { BuildOptions, LibraryFormats, LibraryOptions, UserConfig } from 'vite';

import { findWorkspaceDir } from './find-workspace-dir.js';
import { logger } from './logger.js';

export type PluginName = (typeof PLUGIN_NAMES)[number];

export type LibraryFormat = Extract<LibraryFormats, 'es' | 'cjs'>;

export interface WurkConfigOptions {
  /**
   * Output directory for build. Defaults to "dist".
   */
  readonly outDir?: string;
  /**
   * True or an options object to enable library mode.
   */
  readonly lib?:
    | boolean
    | {
        /**
         * Entry files for the library. Defaults to `src/index.tsx`,
         * `src/index.ts`, `src/index.jsx`, or `src/index.js`.
         */
        readonly entries?: readonly string[];
        /**
         * Library format (ie. "es", "cjs") to build. Defaults to 'es'.
         */
        readonly format?: LibraryFormat;
        /**
         * Preserve modules directory structure (ie. disable bundling).
         * Defaults to true.
         */
        readonly preserveModules?: boolean;
      };
  /**
   * If a plugin is added to this list, it will not be used even if it is
   * installed as a workspace dependency.
   */
  readonly disablePlugins?: readonly PluginName[];
}

export interface WurkUserConfig extends UserConfig {
  root: string;
  plugins: Extract<UserConfig['plugins'], readonly any[]>;
  build: BuildOptions &
    Required<Pick<BuildOptions, 'outDir' | 'rollupOptions'>> & {
      target: 'esnext';
      lib?: LibraryOptions & {
        entry: [string, ...string[]];
        formats: [LibraryFormat];
        fileName: string;
      };
    };
}

const DEFAULT_ENTRIES = ['src/index.tsx', 'src/index.ts', 'src/index.jsx', 'src/index.js'] as const;

export const PLUGIN_NAMES = [
  'vite-plugin-bin',
  'vite-plugin-checker',
  'vite-plugin-dts',
  '@vitejs/plugin-react',
  'vite-plugin-refresh',
  'vite-plugin-svgr',
  'vite-plugin-zip-pack',
] as const;

const plugins = {
  'vite-plugin-bin': import('./plugins/bin.js'),
  'vite-plugin-checker': import('./plugins/checker.js'),
  'vite-plugin-dts': import('./plugins/dts.js'),
  '@vitejs/plugin-react': import('./plugins/react.js'),
  'vite-plugin-refresh': import('./plugins/refresh.js'),
  'vite-plugin-svgr': import('./plugins/svgr.js'),
  'vite-plugin-zip-pack': import('./plugins/zip-pack.js'),
} as const satisfies Record<PluginName, any>;

await Promise.all(Object.values(plugins));

/**
 * Define the Vite config used by the Wurk build command.
 *
 * The returned config is a narrower type than Vite's default `UserConfig`,
 * to allow for easier extension.
 */
export const defineWurkConfig = async (options: WurkConfigOptions = {}): Promise<WurkUserConfig> => {
  const { outDir = 'dist', lib, disablePlugins = [] } = options;
  const dir = (await findWorkspaceDir()) ?? process.cwd();
  const config = await fs.promises.readFile(resolve(dir, 'package.json'), 'utf8').then(JsonAccessor.parse);

  const isPluginEnabled = (name: PluginName): boolean => {
    const isEnabled = !disablePlugins.includes(name) && config.at('devDependencies').at(name).is('string');

    if (isEnabled) {
      logger.info(`vite using optional plugin "${name}"`);
    }

    return isEnabled;
  };

  if (lib) {
    const { entries = [], format = 'es', preserveModules = true } = typeof lib === 'object' ? lib : {};

    let entry: [string, ...string[]] | undefined;

    if (entries.length) {
      entry = Array.from(entries) as [string, ...string[]];
    } else {
      for (const filename of DEFAULT_ENTRIES) {
        const absFilename = resolve(dir, filename);

        if (
          await fs.promises
            .stat(absFilename)
            .then((stats) => stats.isFile())
            .catch(() => false)
        ) {
          entry = [absFilename];
          break;
        }
      }

      if (entry == null) {
        throw new Error('missing library entrypoint');
      }
    }

    logger.info(
      `vite library mode (${preserveModules ? 'preserving modules' : 'bundling'}).${entry.reduce(
        (acc, value) => `${acc}\n  - ${relative(dir, value)}`,
        '',
      )}`,
    );

    const externalIds = new Set([
      ...config.at('dependencies').keys('object'),
      ...config.at('peerDependencies').keys('object'),
      ...config.at('optionalDependencies').keys('object'),
      ...(preserveModules ? config.at('devDependencies').keys('object') : []),
    ]);

    return {
      root: dir,
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
        emptyOutDir: false,
        sourcemap: true,
        lib: {
          entry: entry,
          formats: [format],
          fileName: '[name]',
        },
        rollupOptions: {
          output: { preserveModules },
          external: (source) => {
            const id = source.match(/^(?:@[^/@]+\/)?[^/@]+/u)?.[0] ?? source;
            return isBuiltin(id) || externalIds.has(id);
          },
          // See: https://github.com/vitejs/vite-plugin-react/issues/137
          onwarn: (warning, warn) => {
            if (warning.code !== 'MODULE_LEVEL_DIRECTIVE') warn(warning);
          },
        },
      },
    };
  }

  logger.info('vite app mode');

  return {
    root: dir,
    plugins: [
      isPluginEnabled('vite-plugin-checker') && (await plugins['vite-plugin-checker']).default(),
      isPluginEnabled('vite-plugin-svgr') && (await plugins['vite-plugin-svgr']).default(),
      isPluginEnabled('@vitejs/plugin-react') && (await plugins['@vitejs/plugin-react']).default(),
      isPluginEnabled('vite-plugin-refresh') && (await plugins['vite-plugin-refresh']).default(),
      isPluginEnabled('vite-plugin-zip-pack') && (await plugins['vite-plugin-zip-pack']).default({ inDir: outDir }),
    ],
    build: {
      target: 'esnext',
      outDir,
      emptyOutDir: false,
      rollupOptions: {
        // See: https://github.com/vitejs/vite-plugin-react/issues/137
        onwarn: (warning, warn) => {
          if (warning.code !== 'MODULE_LEVEL_DIRECTIVE') warn(warning);
        },
      },
    },
  };
};
