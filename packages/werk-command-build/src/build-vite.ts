import { stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { type Log, type Spawn, type Workspace } from '@werk/cli';

interface BuildViteOptions {
  readonly log: Log;
  readonly workspace: Workspace;
  readonly start: boolean;
  readonly isEsm: boolean;
  readonly isCommonJs: boolean;
  readonly spawn: Spawn;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultConfig = resolve(__dirname, '..', 'config', 'vite.config.ts');

export const buildVite = async ({
  log,
  workspace,
  start,
  isEsm,
  isCommonJs,
  spawn,
}: BuildViteOptions): Promise<void> => {
  const config = await Promise.all(
    ['vite.config.ts', 'vite.config.js']
      .map((filename) => resolve(workspace.dir, filename))
      .map((filename) =>
        stat(filename)
          .then((stats) => stats.isFile() && filename)
          .catch(() => false),
      ),
  ).then((results) => results.find((filename): filename is string => Boolean(filename)));

  log.notice(`${start ? 'Starting' : 'Building'} workspace "${workspace.name}" using Vite.`);

  const isLib = isEsm || isCommonJs;
  const command = isLib || !start ? 'build' : null;
  const watch = isLib && start ? '--watch' : null;
  const host = start ? '--host' : null;

  await spawn('vite', [command, watch, host, `--config=${config ?? defaultConfig}`], {
    echo: true,
    errorReturn: true,
    errorSetExitCode: true,
  });
};
