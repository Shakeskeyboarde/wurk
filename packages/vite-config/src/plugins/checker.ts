import fs from 'node:fs';
import path from 'node:path';

import { importRelative } from '@werk/cli';

import { findTsConfigDir } from '../find-ts-config-dir.js';
import { findWorkspaceDir } from '../find-workspace-dir.js';
import { getVersion } from '../get-version.js';
import { logger } from '../logger.js';

type Exports = typeof import('vite-plugin-checker');

export default async () => {
  const { exports } = await importRelative<Exports>('vite-plugin-checker', {
    version: getVersion('vite-plugin-checker'),
  });
  const { default: plugin } = exports;
  const [tsRoot, workspaceRoot] = await Promise.all([findTsConfigDir(), findWorkspaceDir()]);
  const pkg = workspaceRoot
    ? await fs.promises.readFile(path.join(workspaceRoot, 'package.json'), 'utf-8').then(JSON.parse)
    : null;
  const isTypescript = await importRelative('typescript')
    .then(() => true)
    .catch(() => false);
  const isEslint =
    Boolean(pkg?.scripts?.eslint) &&
    (await importRelative('eslint')
      .then(() => true)
      .catch(() => false));

  if (isTypescript && !tsRoot) {
    throw new Error('vite-plugin-checker requires a tsconfig.json file when using Typescript.');
  }

  logger.info(`vite-plugin-checker typescript is ${isTypescript ? 'enabled' : 'disabled'}.`);
  logger.info(`vite-plugin-checker eslint is ${isEslint ? 'enabled' : 'disabled'}.`);

  return plugin({
    typescript: isTypescript && tsRoot ? { root: tsRoot } : false,
    eslint: isEslint ? { lintCommand: pkg?.scripts?.eslint } : false,
  });
};
