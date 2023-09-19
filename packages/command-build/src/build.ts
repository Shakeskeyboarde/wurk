import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { type Log, type PackageJson, type Spawn, type Workspace } from '@werk/cli';

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
  const { log, workspace, start } = options;

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
      await buildVite({ ...options, isEsm, isCjs });
    } else if (isRollup) {
      await buildRollup(options);
    } else {
      await buildTsc({ ...options, isEsm, isCjs });
    }
  }

  if (!start && !(await workspace.getIsBuilt())) {
    log.warn('Build incomplete. Not all package.json entry points exist.');
  }
};

const detectVite = async (workspace: Workspace, packageJson: PackageJson): Promise<boolean> => {
  const isViteDevDependency = Boolean(packageJson.devDependencies?.vite);

  if (isViteDevDependency) return true;

  const [isIndexHtmlPresent, isConfigTsPresent, isConfigJsPresent] = await Promise.all([
    stat(resolve(workspace.dir, 'index.html'))
      .then((stats) => stats.isFile())
      .catch(() => false),
    stat(resolve(workspace.dir, 'vite.config.ts'))
      .then((stats) => stats.isFile())
      .catch(() => false),
    stat(resolve(workspace.dir, 'vite.config.js'))
      .then((stats) => stats.isFile())
      .catch(() => false),
  ]);

  return isIndexHtmlPresent || isConfigTsPresent || isConfigJsPresent;
};

const detectRollup = async (workspace: Workspace): Promise<boolean> => {
  return await Promise.all(
    ['rollup.config.ts', 'rollup.config.js', 'rollup.config.mjs'].map(async (filename) => {
      const stats = await stat(resolve(workspace.dir, filename)).catch(() => undefined);
      return stats?.isFile();
    }),
  ).then((results) => results.some(Boolean));
};
