/* eslint-disable @typescript-eslint/consistent-type-imports */
import { readFile, stat } from 'node:fs/promises';
import { isBuiltin } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';

import { findAsync, importRelative, ResolvedImport } from '@werk/cli';
import { type ConfigEnv, type LibraryFormats, type Plugin, type PluginOption, type UserConfig } from 'vite';

interface Plugins {
  '@vitejs/plugin-react': typeof import('@vitejs/plugin-react');
  'vite-plugin-bin': typeof import('vite-plugin-bin');
  'vite-plugin-checker': typeof import('vite-plugin-checker');
  'vite-plugin-dts': typeof import('vite-plugin-dts');
  'vite-plugin-refresh': typeof import('vite-plugin-refresh');
  'vite-plugin-svgr': typeof import('vite-plugin-svgr');
  'vite-plugin-rewrite-all': typeof import('vite-plugin-rewrite-all');
  'vite-plugin-zip-pack': typeof import('vite-plugin-zip-pack');
}

type PluginPromise = Promise<false | Plugin | PluginOption[] | null | undefined>;

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
    entry?: string[];
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
    options: {
      args?:
        | Parameters<Plugins[TName]['default']>
        | ((
            resolved: ResolvedImport<Plugins[TName]>,
          ) =>
            | Promise<Parameters<Plugins[TName]['default']> | undefined>
            | Parameters<Plugins[TName]['default']>
            | undefined);
      version?: string;
    } = {},
  ): PluginPromise => {
    if (plugins?.[name] === false || !packageJson?.devDependencies?.[name]) return undefined;

    const { args, version } = options;
    const resolved = await importRelative<Plugins[TName]>(name, { dir: packageRoot, version });

    logger.info(`vite using optional plugin "${name}".`);

    const resolvedArgs = ((typeof args === 'function' ? await args(resolved) : args) ?? []) as [any];
    const plugin = await resolved.exports.default(...resolvedArgs);

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
    const { entry = [], formats = [], preserveModules = true } = lib;

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

    return {
      root: packageRoot,
      plugins: [
        tryPluginChecker(),
        tryPlugin('vite-plugin-svgr', { version: '^4.0.0' }),
        tryPlugin('@vitejs/plugin-react', { version: '^4.0.4' }),
        tryPlugin('vite-plugin-dts', {
          version: '^3.5.3',
          args: [
            {
              entryRoot: 'src',
              copyDtsFiles: true,
              include: ['src'],
              exclude: ['**/*.test.*', '**/*.spec.*', '**/*.stories.*'],
            },
          ],
        }),
        tryPlugin('vite-plugin-bin', { version: '^1.0.1' }),
        tryPlugin('vite-plugin-zip-pack', {
          version: '^1.0.6',
          args: [{ inDir: 'lib', outDir: 'out', outFileName: 'lib.zip' }],
        }),
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
        args: [{ inDir: 'dist', outDir: 'out', outFileName: 'dist.zip' }],
      }),
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
