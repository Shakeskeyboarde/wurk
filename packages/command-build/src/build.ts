import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { findAsync, type Log, type PackageJson, type Spawn, type Workspace } from '@werk/cli';

import { buildRollup } from './build-rollup.js';
import { buildScript } from './build-script.js';
import { buildTsc } from './build-tsc.js';
import { buildVite } from './build-vite.js';

interface BuildOptions {
  log: Log;
  workspace: Workspace;
  root: Workspace;
  watch: boolean;
  vite: boolean;
  clean: boolean;
  spawn: Spawn;
}

const hasDeepProp = (obj: unknown, test: (key: string, value: unknown) => boolean): boolean => {
  if (typeof obj !== 'object' || obj == null) return false;

  for (const [key, value] of Object.entries(obj)) {
    if (test(key, value)) return true;
    if (hasDeepProp(value, test)) return true;
  }

  return false;
};

const isEsmPackage = (packageJson: Record<string, unknown>): boolean => {
  if (packageJson.type === 'module') return true;
  if (packageJson.module) return true;
  if (hasDeepProp(packageJson.exports, (key) => key === 'import')) return true;
  if (hasDeepProp(packageJson.exports, (_, value) => typeof value === 'string' && value.endsWith('.mjs'))) return true;
  if (typeof packageJson.main === 'string' && packageJson.main.endsWith('.mjs')) return true;
  if (typeof packageJson.bin === 'string' && packageJson.bin.endsWith('.mjs')) return true;
  if (hasDeepProp(packageJson.bin, (_, value) => typeof value === 'string' && value.endsWith('.mjs'))) return true;

  return false;
};

const isCjsPackage = (packageJson: Record<string, unknown>): boolean => {
  if (packageJson.type === 'commonjs' || !packageJson.type) return true;
  if (hasDeepProp(packageJson.exports, (key) => key === 'require')) return true;
  if (hasDeepProp(packageJson.exports, (_, value) => typeof value === 'string' && value.endsWith('.cjs'))) return true;
  if (typeof packageJson.main === 'string' && packageJson.main.endsWith('.cjs')) return true;
  if (typeof packageJson.bin === 'string' && packageJson.bin.endsWith('.cjs')) return true;
  if (hasDeepProp(packageJson.bin, (_, value) => typeof value === 'string' && value.endsWith('.cjs'))) return true;

  return false;
};

const isLibPackage = (packageJson: Record<string, unknown>): boolean => {
  return Boolean(packageJson.exports || packageJson.main || packageJson.module || packageJson.types || packageJson.bin);
};

export const build = async ({
  log,
  root,
  workspace,
  watch,
  vite: forceVite,
  clean,
  spawn,
}: BuildOptions): Promise<boolean | null> => {
  const scriptName = watch ? 'start' : 'build';
  const isScriptPresent = workspace.scripts[scriptName] != null;
  const maybeClean = async (): Promise<void> => {
    if (clean) await workspace.clean();
  };

  if (isScriptPresent) {
    await maybeClean();
    return await buildScript({ log, workspace, scriptName, spawn });
  }

  const rollupConfig = await detectRollup(workspace);

  if (rollupConfig) {
    await maybeClean();
    return await buildRollup({ log, workspace, watch, ...rollupConfig, spawn });
  }

  const [packageJson, rootPackageJson] = await Promise.all([workspace.readPackageJson(), root.readPackageJson()]);
  const viteConfig = await detectVite(workspace, packageJson);
  const isLib = isLibPackage(packageJson);
  const isEsm = isLib && isEsmPackage(packageJson);
  const isCjs = isLib && isCjsPackage(packageJson);

  if (viteConfig || forceVite) {
    await maybeClean();
    return await buildVite({
      log,
      workspace,
      watch,
      clean,
      isEsm: isLib && isEsm,
      isCjs: isLib && isCjs,
      ...(viteConfig || {
        isIndexHtmlPresent: false,
        customConfigFile: undefined,
      }),
      spawn,
    });
  }

  const isTypescript = Boolean(packageJson.dependencies?.typescript || rootPackageJson.devDependencies?.typescript);

  if (isTypescript && isLib) {
    await maybeClean();
    return await buildTsc({ log, root, workspace, watch, isEsm, isCjs, spawn });
  }

  return null;
};

const detectVite = async (
  workspace: Workspace,
  packageJson: PackageJson,
): Promise<{ isIndexHtmlPresent: boolean; customConfigFile: string | undefined } | false> => {
  const isViteDevDependency = Boolean(packageJson.devDependencies?.vite);

  const [isIndexHtmlPresent, customConfigFile] = await Promise.all([
    stat(resolve(workspace.dir, 'index.html'))
      .then((stats) => stats.isFile())
      .catch(() => false),
    findAsync(
      ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs'].map((ext) => resolve(workspace.dir, `vite.config.${ext}`)),
      (filename) =>
        stat(filename)
          .then((stats) => stats.isFile())
          .catch(() => false),
    ),
  ]);

  return (
    (isViteDevDependency || isIndexHtmlPresent || Boolean(customConfigFile)) && {
      isIndexHtmlPresent,
      customConfigFile,
    }
  );
};

const detectRollup = async (workspace: Workspace): Promise<{ customConfigFile: string } | false> => {
  const customConfigFile = await findAsync(
    ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs'].map((ext) => resolve(workspace.dir, `rollup.config.${ext}`)),
    (filename) =>
      stat(filename)
        .then((stats) => stats.isFile())
        .catch(() => false),
  );

  return customConfigFile ? { customConfigFile } : false;
};
