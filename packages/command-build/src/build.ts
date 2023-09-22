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
  spawn: Spawn;
}

const isEsmPackage = (packageJson: Record<string, unknown>): boolean => {
  return Boolean(packageJson.exports || (packageJson.bin && packageJson.type === 'module'));
};

const isCjsPackage = (packageJson: Record<string, unknown>): boolean => {
  return Boolean(packageJson.main || (packageJson.bin && (!packageJson.type || packageJson.type === 'commonjs')));
};

export const build = async ({ log, root, workspace, watch, vite, spawn }: BuildOptions): Promise<boolean | null> => {
  const scriptName = watch ? 'start' : 'build';

  if (
    !vite &&
    workspace.scripts[scriptName] != null &&
    /*
     * Avoid infinite recursion if this is a root workspace script
     * and the root workspace is included.
     */
    (process.env.npm_command !== 'run-script' || process.env.npm_lifecycle_event !== scriptName)
  ) {
    return await buildScript({ log, workspace, scriptName, spawn });
  }

  const [packageJson, rootPackageJson] = await Promise.all([workspace.readPackageJson(), root.readPackageJson()]);
  const [isVite, isRollup] = await Promise.all([detectVite(workspace, packageJson), detectRollup(workspace)]);
  const isTypescript = Boolean(packageJson.devDependencies?.typescript || rootPackageJson.devDependencies?.typescript);
  const isEsm = isEsmPackage(packageJson);
  const isCjs = isCjsPackage(packageJson);

  if (vite || isVite)
    return await buildVite({
      log,
      workspace,
      watch,
      isEsm,
      isCjs,
      ...(isVite || {
        isIndexHtmlPresent: false,
        customConfigFile: undefined,
      }),
      spawn,
    });

  if (isRollup) return await buildRollup({ log, workspace, watch, ...isRollup, spawn });

  if (isTypescript) return await buildTsc({ log, root, workspace, watch, isEsm, isCjs, spawn });

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
