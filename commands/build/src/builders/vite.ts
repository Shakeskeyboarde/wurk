import { type Log } from 'wurk';

import { Builder, type BuilderFactory } from '../builder.js';

export const getViteBuilder: BuilderFactory = async (workspace) => {
  const { fs, spawn } = workspace;

  const filenames = await fs
    .find(['vite.config*.*', 'src/vite.config*.*'])
    .then((entries) => {
      return entries.map((entry) => {
        return fs.relative(entry.fullpath());
      });
    });

  if (!filenames.length) return null;

  const vite = async (
    watch: boolean,
    log: Log,
    filename: string,
  ): Promise<void> => {
    await spawn('vite', [watch ? 'serve' : 'build', '--config', filename], {
      log,
      output: 'echo',
    });
  };

  return new Builder('vite', workspace, {
    build: vite.bind(null, false),
    start: vite.bind(null, true),
    matrix: filenames,
  });
};
