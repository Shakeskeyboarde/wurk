import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { type Workspace } from 'wurk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TSCONFIG_BASE_DEFAULT = path.resolve(__dirname, '..', 'config', 'tsconfig.wurk.json');

interface BuildTscOptions {
  readonly root: Workspace;
  readonly workspace: Workspace;
  readonly start: boolean;
  readonly isEsm: boolean;
  readonly isCjs: boolean;
}

export const buildTsc = async ({ workspace, root, start, isEsm, isCjs }: BuildTscOptions): Promise<void> => {
  const { status, log, fs, config, dir, spawn } = workspace;

  status.set('pending', 'tsc');
  log.info(start ? `starting TypeScript compiler in watch mode` : `building with TypeScript compiler`);

  const tsBuildConfigs = await fs.readdir('.', { withFileTypes: true }).then((files) => {
    return files
      .filter((file) => file.isFile() && /^tsconfig\..*build.*\.json$/u.test(file.name))
      .map((file) => fs.resolve(file.name));
  });

  if (!tsBuildConfigs.length) {
    const tempSubDir = path.relative(root.dir, dir);
    const posixWorkspaceRoot = dir.replace(/\\/gu, '/');

    if (tempSubDir.startsWith('..')) throw new Error(`workspace directory "${dir}" is outside of the workspaces root`);

    const tempDir = root.fs.resolve(root.dir, 'node_modules/.wurk-command-build', tempSubDir);
    const tsConfigBase = (await fs.findUp('tsconfig.json')) ?? TSCONFIG_BASE_DEFAULT;
    const tsConfigs: ({ outDir: string; module: string } & Record<string, unknown>)[] = [];

    if (isEsm) {
      tsConfigs.push({
        outDir: fs.resolve(isCjs ? 'lib/esm' : 'lib'),
        module: 'ESNext',
        moduleResolution: 'bundler',
      });
    }

    if (isCjs) {
      tsConfigs.push({
        outDir: fs.resolve(isEsm ? 'lib/cjs' : 'lib'),
        module: 'CommonJS',
        moduleResolution: 'node',
      });
    }

    for (const tsConfig of tsConfigs) {
      const filename = fs.resolve(tempDir, `tsconfig.build-${tsConfig.module.toLowerCase()}.json`);
      const json = {
        extends: tsConfigBase,
        compilerOptions: {
          moduleDetection: 'auto',
          noEmit: false,
          emitDeclarationOnly: false,
          declaration: true,
          sourceMap: true,
          rootDir: fs.resolve('src'),
          ...tsConfig,
        },
        include: [path.posix.resolve(posixWorkspaceRoot, 'src')],
        exclude: ['**/*.test.*', '**/*.spec.*', '**/*.stories.*'].map((pattern) => {
          return path.posix.resolve(posixWorkspaceRoot, pattern);
        }),
      };

      await fs.writeJson(filename, json);

      tsBuildConfigs.push(filename);
    }
  }

  const build = async (filename: string): Promise<void> => {
    const name = path.basename(filename).replace(/^tsconfig\.|\.json$/gu, '');
    const subLog = log.clone({ prefix: `${log.prefix}(${name})` });
    const { noEmit, emitDeclarationOnly, outDir, isEsmConfig } = await readTsConfig(filename, workspace);

    if (!noEmit && !emitDeclarationOnly && isEsm != null && fs.resolve(outDir, dir) !== '') {
      await fs.mkdir(outDir);

      const type = isEsmConfig ? 'module' : 'commonjs';

      subLog.info(`creating ${isEsmConfig ? 'ESM' : 'CommonJS'} library`);

      if (type !== config.at('type').value) {
        await fs.writeJson(fs.resolve(outDir, 'package.json'), { type: isEsmConfig ? 'module' : 'commonjs' });
      }
    }

    await spawn('tsc', ['-p', filename, start && '--watch'], { output: 'echo', log: subLog });
  };

  if (start) {
    status.set('success');
    await Promise.all(tsBuildConfigs.map(build));
    return;
  }

  for (const filename of tsBuildConfigs) {
    await build(filename);
  }

  status.set('success');
};

const readTsConfig = async (
  filename: string,
  workspace: Workspace,
): Promise<{ noEmit: boolean; emitDeclarationOnly: boolean; outDir: string; isEsmConfig: boolean | null }> => {
  const { spawn, fs, config } = workspace;
  const tsConfig = await spawn('tsc', ['-p', filename, '--showConfig']).stdoutJson();
  const compilerOptions = tsConfig.at('compilerOptions');
  const noEmit = compilerOptions.at('noEmit').as('boolean', false);
  const emitDeclarationOnly = compilerOptions.at('emitDeclarationOnly').as('boolean', false);
  const outDir = fs.resolve(compilerOptions.at('outDir').as('string', '.'));
  const configTarget = compilerOptions.at('target').as('string', 'es3').toLowerCase();
  const configModule = compilerOptions
    .at('module')
    .as('string', configTarget === 'es3' || configTarget === 'es5' ? 'commonjs' : 'es6')
    .toLowerCase();
  const isEsmConfig =
    configModule === 'commonjs'
      ? false
      : configModule.startsWith('es')
        ? true
        : configModule.startsWith('node')
          ? config.at('type').value === 'module'
          : null;

  return { noEmit, emitDeclarationOnly, outDir, isEsmConfig };
};
