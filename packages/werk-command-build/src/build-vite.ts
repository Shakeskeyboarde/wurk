import { copyFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { type Log, type Spawn, type Workspace } from '@werk/cli';

interface BuildViteOptions {
  readonly log: Log;
  readonly workspace: Workspace;
  readonly start: boolean;
  readonly spawn: Spawn;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultConfig = resolve(__dirname, '..', 'config', 'vite.config.ts');

export const buildVite = async ({ log, workspace, start, spawn }: BuildViteOptions): Promise<void> => {
  let config = await Promise.all(
    ['vite.config.ts', 'vite.config.js']
      .map((filename) => resolve(workspace.dir, filename))
      .map((filename) =>
        stat(filename)
          .then((stats) => stats.isFile() && filename)
          .catch(() => false),
      ),
  ).then((results) => results.find((filename): filename is string => Boolean(filename)));

  if (!config) {
    config = resolve(workspace.dir, 'vite.config.ts');
    await workspace.saveAndRestoreFile(config);
    await copyFile(defaultConfig, config);
  }

  log.notice(`${start ? 'Starting' : 'Building'} workspace "${workspace.name}" using Vite.`);

  await spawn('vite', [!start && 'build', start && '--host', `--config=${config}`], {
    echo: true,
    errorReturn: true,
    errorSetExitCode: true,
  });
};
