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
  root: { dir: string };
  start: boolean;
  spawn: Spawn;
}

const isEsmPackage = (packageJson: Record<string, unknown>): boolean => {
  return Boolean(packageJson.exports || (packageJson.bin && packageJson.type === 'module'));
};

const isCjsPackage = (packageJson: Record<string, unknown>): boolean => {
  return Boolean(packageJson.main || (packageJson.bin && (!packageJson.type || packageJson.type === 'commonjs')));
};

export const build = async (options: BuildOptions): Promise<void> => {
  const { workspace, start } = options;

  if (
    start
      ? workspace.scripts.start != null
      : workspace.scripts.build != null &&
        // Avoid infinite recursion.
        (process.env.npm_command !== 'run-script' || process.env.npm_lifecycle_event !== 'build')
  ) {
    await buildScript(options);
  } else {
    const packageJson = await workspace.readPackageJson();
    const [isVite, isRollup] = await Promise.all([detectVite(workspace, packageJson), detectRollup(workspace)]);
    const isEsm = isEsmPackage(packageJson);
    const isCjs = isCjsPackage(packageJson);

    if (isVite) {
      await buildVite({ ...options, isEsm, isCjs, ...isVite });
    } else if (isRollup) {
      await buildRollup({ ...options, ...isRollup });
    } else {
      await buildTsc({ ...options, isEsm, isCjs });
    }
  }
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
