/* eslint-disable max-lines */
import { readFile, stat } from 'node:fs/promises';
import { isBuiltin } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';

import type PluginReact from '@vitejs/plugin-react';
import { findAsync, importRelative, type ResolvedImport } from '@werk/cli';
import type { ConfigEnv, LibraryFormats, Plugin, UserConfig } from 'vite';
import type PluginBin from 'vite-plugin-bin';
import type { default as PluginChecker } from 'vite-plugin-checker';
import type PluginDts from 'vite-plugin-dts';
import type PluginRefresh from 'vite-plugin-refresh';
import type PluginRewriteAll from 'vite-plugin-rewrite-all';
import type PluginSvgr from 'vite-plugin-svgr';
import type PluginZipPack from 'vite-plugin-zip-pack';

interface Plugins {
  '@vitejs/plugin-react': { default: typeof PluginReact };
  'vite-plugin-bin': { default: typeof PluginBin };
  'vite-plugin-checker': { default: typeof PluginChecker };
  'vite-plugin-dts': { default: typeof PluginDts };
  'vite-plugin-refresh': { default: typeof PluginRefresh };
  'vite-plugin-svgr': { default: typeof PluginSvgr };
  'vite-plugin-rewrite-all': { default: typeof PluginRewriteAll };
  'vite-plugin-zip-pack': { default: typeof PluginZipPack.default };
}

type PluginOption = false | Plugin | PluginOption[] | null | undefined;
type PluginPromise = Promise<PluginOption>;

export type SupportedPlugin = keyof Plugins;
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
    entry?: string[];
    /**
     * Library format (ie. "es", "cjs") to build. Defaults to 'es'.
     */
    format?: LibraryFormats;
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
  disablePlugins?: SupportedPlugin[];
}

const readPackage = async (
  current = process.cwd(),
): Promise<{ packageJson: Record<string, any>; packageRoot: string } | undefined> => {
  return await readFile(join(current, 'package.json'), 'utf8')
    .then((text) => ({ packageJson: JSON.parse(text) as Record<string, any>, packageRoot: current }))
    .catch(() => {
      const parent = dirname(current);
      return parent === current ? undefined : readPackage(parent);
    });
};

export const getViteConfig = async (
  env: ConfigEnv,
  { outDir = 'dist', emptyOutDir = true, lib, disablePlugins = [] }: WerkConfigOptions = {},
): Promise<UserConfig> => {
  // eslint-disable-next-line import/no-extraneous-dependencies
  const vite = await import('vite');
  const logger = vite.createLogger();
  const { packageJson, packageRoot } = (await readPackage()) ?? { packageJson: {}, packageRoot: process.cwd() };
  const workspacesRoot = vite.searchForWorkspaceRoot(packageRoot, packageRoot);
  const workspacesJson: Record<string, any> = await readFile(resolve(workspacesRoot, 'package.json'), 'utf8')
    .then(JSON.parse)
    .catch(() => ({}));

  const tryPlugin = async <TName extends keyof Plugins>(
    name: TName,
    options: {
      args?: (
        resolved: ResolvedImport<Plugins[TName]>,
      ) =>
        | Promise<Parameters<Plugins[TName]['default']> | undefined>
        | Parameters<Plugins[TName]['default']>
        | undefined;
      version?: string;
    } = {},
  ): PluginPromise => {
    if (disablePlugins.includes(name) || !packageJson?.devDependencies?.[name]) return undefined;

    const { args, version } = options;
    const resolved = await importRelative<Plugins[TName]>(name, { dir: packageRoot, version });

    logger.info(`vite using optional plugin "${name}".`);

    const resolvedArgs = (await args?.(resolved)) ?? [];
    const plugin: PluginOption = resolved.exports.default(...resolvedArgs);

    return plugin;
  };

  const tryPluginChecker = (): PluginPromise => {
    return tryPlugin('vite-plugin-checker', {
      version: '>=0.6.2 <1',
      args: async () => {
        const eslint = Boolean(workspacesJson.devDependencies?.eslint && packageJson.scripts?.eslint);
        const typescript = Boolean(workspacesJson.devDependencies?.typescript);
        const tsconfigPath = typescript
          ? await findAsync([resolve(packageRoot, 'tsconfig.json')], (value) =>
              stat(value)
                .then((stats) => stats.isFile())
                .catch(() => false),
            )
          : undefined;

        if (typescript && !tsconfigPath) {
          throw new Error('vite-plugin-checker requires a workspace tsconfig.json file when using Typescript.');
        }

        logger.info(`vite-plugin-checker typescript is ${typescript ? 'enabled' : 'disabled'}.`);
        logger.info(`vite-plugin-checker eslint is ${eslint ? 'enabled' : 'disabled'}.`);

        return [
          {
            typescript: tsconfigPath ? { tsconfigPath } : false,
            eslint: eslint ? { lintCommand: packageJson.scripts.eslint } : false,
          },
        ];
      },
    });
  };

  if (lib) {
    const { entry = [], format = 'es', preserveModules = true } = lib;

    if (entry.length === 0) entry.push(resolve(packageRoot, 'src/index.ts'));

    logger.info(
      `vite library mode (${preserveModules ? 'preserving modules' : 'bundling'}).${entry.reduce(
        (acc, value) => `${acc}\n  - ${relative(packageRoot, value)}`,
        '',
      )}`,
    );

    const externalIds = Object.keys({
      ...packageJson.dependencies,
      ...packageJson.peerDependencies,
      ...packageJson.optionalDependencies,
      ...(preserveModules ? packageJson.devDependencies : undefined),
    });

    // eslint-disable-next-line import/no-extraneous-dependencies
    const { default: ts } = await import('typescript');

    return {
      root: packageRoot,
      plugins: [
        tryPluginChecker(),
        tryPlugin('vite-plugin-svgr', { version: '^4.0.0' }),
        tryPlugin('@vitejs/plugin-react', { version: '^4.0.4' }),
        format == 'es' || format == 'cjs'
          ? tryPlugin('vite-plugin-dts', {
              version: '^3.5.3',
              args: () => [
                {
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
                },
              ],
            })
          : null,
        tryPlugin('vite-plugin-bin', { version: '^1.0.1' }),
        tryPlugin('vite-plugin-zip-pack', {
          version: '^1.0.6',
          args: () => [
            {
              inDir: outDir,
              outDir: 'out',
              outFileName: `${outDir.replace(/^[\\/]+|[\\/]+$/gu, '').replace(/[\\/:]+/gu, '-')}.zip`,
            },
          ],
        }),
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
    plugins: [
      tryPluginChecker(),
      tryPlugin('vite-plugin-svgr', { version: '^4.0.0' }),
      tryPlugin('@vitejs/plugin-react', { version: '^4.0.4' }),
      tryPlugin('vite-plugin-refresh', { version: '^1.0.3' }),
      tryPlugin('vite-plugin-rewrite-all', { version: '^1.0.1' }),
      tryPlugin('vite-plugin-zip-pack', {
        version: '^1.0.6',
        args: () => [
          {
            inDir: outDir,
            outDir: 'out',
            outFileName: `${outDir.replace(/^[\\/]+|[\\/]+$/gu, '').replace(/[\\/:]+/gu, '-')}.zip`,
          },
        ],
      }),
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
