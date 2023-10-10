import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { findAsync, Log, type Spawn, type Workspace } from '@werk/cli';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TSCONFIG_BASE_DEFAULT = resolve(__dirname, '..', 'config', 'tsconfig.werk.json');

interface BuildTscOptions {
  readonly log: Log;
  readonly workspace: Workspace;
  readonly root: { dir: string };
  readonly watch: boolean;
  readonly isEsm: boolean;
  readonly isCjs: boolean;
  readonly spawn: Spawn;
}

export const buildTsc = async ({
  log,
  workspace,
  root,
  watch,
  isEsm,
  isCjs,
  spawn,
}: BuildTscOptions): Promise<boolean> => {
  const tsBuildConfigs = await readdir(workspace.dir, { withFileTypes: true }).then((files) => {
    return files
      .filter((file) => file.isFile() && /^tsconfig\..*build.*\.json$/u.test(file.name))
      .map((file) => resolve(workspace.dir, file.name));
  });

  if (!tsBuildConfigs.length) {
    const tempSubDir = relative(root.dir, workspace.dir);
    const posixWorkspaceRoot = resolve(workspace.dir).replace(/\\/gu, '/');

    if (tempSubDir.startsWith('..'))
      throw new Error(`Workspace directory "${workspace.dir}" is outside of the workspaces root.`);

    const tempDir = resolve(root.dir, 'node_modules/.werk-command-build', tempSubDir);
    const tsConfigBase =
      (await findAsync(
        [resolve(workspace.dir, 'tsconfig.json'), resolve(root.dir, 'tsconfig.json')],
        async (filename) =>
          await stat(filename)
            .then((stats) => stats.isFile())
            .catch(() => false),
      )) ?? TSCONFIG_BASE_DEFAULT;
    const configs: ({ outDir: string; module: string } & Record<string, unknown>)[] = [];

    if (isEsm) {
      configs.push({
        outDir: resolve(workspace.dir, isCjs ? 'lib/esm' : 'lib'),
        module: 'ESNext',
        moduleResolution: 'bundler',
      });
    }

    if (isCjs) {
      configs.push({
        outDir: resolve(workspace.dir, isEsm ? 'lib/cjs' : 'lib'),
        module: 'CommonJS',
        moduleResolution: 'node',
      });
    }

    for (const config of configs) {
      const filename = resolve(tempDir, `tsconfig.build-${config.module.toLowerCase()}.json`);

      await mkdir(tempDir, { recursive: true });
      await writeFile(
        filename,
        JSON.stringify(
          {
            extends: tsConfigBase,
            compilerOptions: {
              moduleDetection: 'auto',
              noEmit: false,
              emitDeclarationOnly: false,
              declaration: true,
              sourceMap: true,
              rootDir: resolve(workspace.dir, 'src'),
              ...config,
            },
            include: [posix.resolve(posixWorkspaceRoot, 'src')],
            exclude: ['**/*.test.*', '**/*.spec.*', '**/*.stories.*'].map((pattern) => {
              return posix.resolve(posixWorkspaceRoot, pattern);
            }),
          },
          null,
          2,
        ),
      );

      tsBuildConfigs.push(filename);
    }
  }

  log.notice(`${watch ? 'Starting' : 'Building'} workspace "${workspace.name}" using TypeScript.`);

  const results = await Promise.all(
    tsBuildConfigs.map(async (filename) => {
      const name = basename(filename).replace(/^tsconfig\.|\.json$/gu, '');
      const subLog = new Log({ ...log, prefix: `${log.prefix}(${name})` });
      const { noEmit, emitDeclarationOnly, outDir, isEsmConfig } = await readTsConfig(filename, workspace, spawn);

      if (!noEmit && !emitDeclarationOnly && isEsm != null && resolve(outDir, workspace.dir) !== '') {
        await mkdir(outDir, { recursive: true });

        const type = isEsmConfig ? 'module' : 'commonjs';

        if (type !== workspace.type) {
          await writeFile(
            resolve(outDir, 'package.json'),
            JSON.stringify({ type: isEsmConfig ? 'module' : 'commonjs' }),
          );
        }
      }

      return await spawn('tsc', ['-p', filename, watch && '--watch'], {
        cwd: workspace.dir,
        echo: true,
        errorSetExitCode: true,
        errorReturn: true,
        log: subLog,
      }).succeeded();
    }),
  );

  return results.every(Boolean);
};

const readTsConfig = async (
  filename: string,
  workspace: Workspace,
  spawn: Spawn,
): Promise<{ noEmit: boolean; emitDeclarationOnly: boolean; outDir: string; isEsmConfig: boolean | null }> => {
  const config = await spawn('tsc', ['-p', filename, '--showConfig'], {
    cwd: workspace.dir,
    capture: true,
  }).getJson<{
    compilerOptions?: {
      noEmit?: boolean;
      emitDeclarationOnly?: boolean;
      outDir?: string;
      module?: string;
      target?: string;
    };
  }>();

  const noEmit = config.compilerOptions?.noEmit ?? false;
  const emitDeclarationOnly = config.compilerOptions?.emitDeclarationOnly ?? false;
  const outDir = resolve(workspace.dir, config.compilerOptions?.outDir ?? '.');
  const configTarget = config.compilerOptions?.target?.toLowerCase() ?? 'es3';
  const configModule =
    config.compilerOptions?.module?.toLowerCase() ??
    (configTarget === 'es3' || configTarget === 'es5' ? 'commonjs' : 'es6');
  const isEsmConfig =
    configModule === 'commonjs'
      ? false
      : configModule.startsWith('es')
      ? true
      : configModule.startsWith('node')
      ? workspace.type === 'module'
      : null;

  return { noEmit, emitDeclarationOnly, outDir, isEsmConfig };
};
