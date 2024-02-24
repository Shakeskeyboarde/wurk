import { type Workspace } from 'wurk';

import { Builder } from '../builder.js';

export const getRollupBuilder = async (
  workspace: Workspace,
): Promise<Builder | null> => {
  const { fs, spawn } = workspace;

  const filenames = await fs
    .find(['rollup.config*.*', 'src/rollup.config*.*'])
    .then((entries) => {
      return entries.map((entry) => {
        return fs.relative(entry.fullpath());
      });
    });

  if (!filenames.length) return null;

  return new Builder('rollup', workspace, {
    build: async (log, filename) => {
      await spawn(
        'rollup',
        [
          '--config',
          filename,
          filename.endsWith('.ts') && ['--configPlugin', 'typescript'],
        ],
        { log, output: 'echo' },
      );
    },
    start: async (log, filename) => {
      await spawn(
        'rollup',
        [
          '--watch',
          '--config',
          filename,
          filename.endsWith('.ts') && ['--configPlugin', 'typescript'],
        ],
        { log, output: 'echo' },
      );
    },
    matrix: filenames,
  });
};
