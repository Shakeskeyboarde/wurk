import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Log, type PackageJson, type Spawn, type Workspace } from '@werk/cli';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface BuildTscOptions {
  readonly log: Log;
  readonly workspace: Workspace;
  readonly root: { dir: string };
  readonly start: boolean;
  readonly spawn: Spawn;
}

export const buildTsc = async ({ log, workspace, root, start, spawn }: BuildTscOptions): Promise<void> => {
  const tsBuildConfigs = await readdir(workspace.dir, { withFileTypes: true }).then((files) => {
    return files
      .filter((file) => file.isFile() && /^tsconfig\..*build.*\.json$/u.test(file.name))
      .map((file) => resolve(workspace.dir, file.name));
  });

  if (!tsBuildConfigs.length) {
    const tsConfig = resolve(workspace.dir, 'tsconfig.json');
    const rootTsConfig = resolve(root.dir, 'tsconfig.json');
    const defaultTsConfig = resolve(__dirname, '..', 'config', 'tsconfig.json');
    const [packageJson, extendsTsConfig] = await Promise.all([
      workspace.readPackageJson(),
      Promise.all([
        stat(tsConfig)
          .then((stats): false | string => stats.isFile() && tsConfig)
          .catch((): false => false),
        stat(rootTsConfig)
          .then((stats): false | string => stats.isFile() && rootTsConfig)
          .catch((): false => false),
      ]).then((tsConfigs) => tsConfigs.find(Boolean) || defaultTsConfig),
    ]);
    const configs: ({ outDir: string; module: string } & Record<string, unknown>)[] = [];
    const isEsm = isEsmEntry(packageJson);
    const isCommonJs = isCommonJsEntry(packageJson);

    if (isEsm) {
      configs.push({
        outDir: isCommonJs ? 'lib/esm' : 'lib',
        module: 'ESNext',
        moduleResolution: 'bundler',
      });
    }

    if (isCommonJs) {
      configs.push({
        outDir: isEsm ? 'lib/cjs' : 'lib',
        module: 'CommonJS',
        moduleResolution: 'node',
      });
    }

    for (const config of configs) {
      const filename = resolve(workspace.dir, `tsconfig.build-${config.module.toLowerCase()}.json`);

      await workspace.saveAndRestoreFile(filename);
      await writeFile(
        filename,
        JSON.stringify({
          extends: extendsTsConfig,
          compilerOptions: {
            moduleDetection: 'auto',
            noEmit: false,
            emitDeclarationOnly: false,
            declaration: true,
            sourceMap: true,
            rootDir: 'src',
            ...config,
          },
          include: ['src'],
          exclude: ['**/*.test.*', '**/*.spec.*', '**/*.stories.*'],
        }),
      );

      tsBuildConfigs.push(filename);
    }
  }

  await Promise.all(
    tsBuildConfigs.map(async (filename) => {
      const name = basename(filename).replace(/(^tsconfig\.|\.json$)/gu, '');
      const subLog = new Log({ ...log, prefix: `${log.prefix}(${name})` });
      const { noEmit, emitDeclarationOnly, outDir, isEsm } = await readTsConfig(filename, workspace, spawn);

      log.notice(
        `${start ? 'Starting' : 'Building'} workspace "${workspace.name}" using TypeScript configuration "${basename(
          filename,
        )}".`,
      );

      if (!noEmit && !emitDeclarationOnly && isEsm != null && resolve(outDir, workspace.dir) !== '') {
        await mkdir(outDir, { recursive: true });
        await writeFile(resolve(outDir, 'package.json'), JSON.stringify({ type: isEsm ? 'module' : 'commonjs' }));
      }

      await spawn('tsc', ['-p', filename, start && '--watch'], {
        echo: true,
        errorSetExitCode: true,
        errorReturn: true,
        log: subLog,
      });
    }),
  );
};

const readTsConfig = async (
  filename: string,
  workspace: Workspace,
  spawn: Spawn,
): Promise<{ noEmit: boolean; emitDeclarationOnly: boolean; outDir: string; isEsm: boolean | null }> => {
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
  const isEsm =
    configModule === 'commonjs'
      ? false
      : configModule.startsWith('es')
      ? true
      : configModule.startsWith('node')
      ? workspace.type === 'module'
      : null;

  return { noEmit, emitDeclarationOnly, outDir, isEsm };
};

const isEsmEntry = (packageJson: PackageJson): boolean => {
  return Boolean(packageJson.exports || (packageJson.bin && packageJson.type === 'module'));
};

const isCommonJsEntry = (packageJson: PackageJson): boolean => {
  return Boolean(packageJson.main || (packageJson.bin && (!packageJson.type || packageJson.type === 'commonjs')));
};
