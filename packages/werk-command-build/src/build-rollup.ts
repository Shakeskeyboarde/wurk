import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { type Log, type Spawn, type Workspace } from '@werk/cli';

interface BuildRollupOptions {
  readonly log: Log;
  readonly workspace: Workspace;
  readonly start: boolean;
  readonly spawn: Spawn;
}

export const buildRollup = async ({ log, workspace, start, spawn }: BuildRollupOptions): Promise<void> => {
  const config = await Promise.all(
    ['rollup.config.ts', 'rollup.config.js', 'rollup.config.mjs']
      .map((filename) => resolve(workspace.dir, filename))
      .map((filename) =>
        stat(filename)
          .then((stats) => stats.isFile() && filename)
          .catch(() => false),
      ),
  ).then((results) => results.find((filename): filename is string => Boolean(filename)));

  log.notice(`${start ? 'Starting' : 'Building'} workspace "${workspace.name}" using Rollup.`);

  await spawn(
    'rollup',
    [config && `--config=${config}`, config?.endsWith('.ts') && `--configPlugin=typescript`, start && '--watch'],
    {
      echo: true,
      errorReturn: true,
      errorSetExitCode: true,
    },
  );
};
