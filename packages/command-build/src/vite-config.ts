/* eslint-disable @typescript-eslint/consistent-type-imports */
import { readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { findAsync, importRelative } from '@werk/cli';
import { type ConfigEnv, type LibraryFormats, type PluginOption, type UserConfig } from 'vite';
import { type default as CheckerType } from 'vite-plugin-checker';

interface Plugins {
  '@vitejs/plugin-react': typeof import('@vitejs/plugin-react');
  'vite-plugin-bin': typeof import('vite-plugin-bin');
  'vite-plugin-checker': typeof import('vite-plugin-checker');
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
  { emptyOutDir = true, lib, plugins }: ViteConfigOptions = {},
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
    args?: Parameters<Plugins[TName]['default']> | (() => Promise<Parameters<Plugins[TName]['default']> | undefined>),
  ): Extract<PluginOption, Promise<any>> => {
    if (plugins?.[name] === false || !packageJson?.devDependencies?.[name]) return undefined;

    const result = await importRelative<Plugins[TName]>(name, { dir: packageRoot });

    logger.info(`vite using optional plugin "${name}".`);

    const resolvedArgs = ((typeof args === 'function' ? await args() : args) ?? []) as [any];

    return { ...result.exports.default(...resolvedArgs) };
  };

  const getCheckerConfig = async (): Promise<Parameters<typeof CheckerType>> => {
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
  };

  if (lib) {
    const { entry = 'src/index.ts', formats = [], preserveModules = true } = lib;

    logger.info(`vite library mode (${preserveModules ? 'preserving modules' : 'bundling'}).`);

    const external: RegExp[] = [/^node:/u];
    const deps = Object.keys({
      ...packageJson.dependencies,
      ...packageJson.peerDependencies,
      ...packageJson.optionalDependencies,
      ...(preserveModules ? packageJson.devDependencies : undefined),
    });

    if (deps.length) {
      external.push(new RegExp(`^(?:${deps.join('|')})(?:/|$)`, 'u'));
    }

    return {
      root: packageRoot,
      plugins: [
        tryPlugin('vite-plugin-checker', getCheckerConfig),
        tryPlugin('vite-plugin-svgr', [{ exportAsDefault: true, svgrOptions: { exportType: 'default' } } as any]),
        tryPlugin('@vitejs/plugin-react'),
        tryPlugin('vite-plugin-dts', [
          {
            entryRoot: 'src',
            copyDtsFiles: true,
            include: ['src'],
            exclude: ['**/*.test.*', '**/*.spec.*', '**/*.stories.*'],
          },
        ]),
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
      tryPlugin('vite-plugin-checker', getCheckerConfig),
      tryPlugin('vite-plugin-svgr', [{ exportAsDefault: true, svgrOptions: { exportType: 'default' } } as any]),
      tryPlugin('@vitejs/plugin-react'),
      tryPlugin('vite-plugin-refresh'),
    ],
    build: {
      target: 'esnext',
      outDir: 'dist',
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
