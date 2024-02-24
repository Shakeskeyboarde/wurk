import { type Workspace } from 'wurk';

import { Builder } from '../builder.js';

export const getViteBuilder = async (
  workspace: Workspace,
): Promise<Builder | null> => {
  const { fs, spawn } = workspace;

  const filenames = await fs
    .find(['vite.config*.*', 'src/vite.config*.*'])
    .then((entries) => {
      return entries.map((entry) => {
        return fs.relative(entry.fullpath());
      });
    });

  if (!filenames.length) return null;

  return new Builder('vite', workspace, {
    build: async (log, filename) => {
      await spawn('vite', ['build', '--config', filename], {
        log,
        output: 'echo',
      });
    },
    start: async (log, filename) => {
      await spawn('vite', ['serve', '--config', filename], {
        log,
        output: 'echo',
      });
    },
    matrix: filenames,
  });
};
