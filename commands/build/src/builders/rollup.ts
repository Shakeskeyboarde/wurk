import { type Log } from 'wurk';

import { Builder, type BuilderFactory } from '../builder.js';

export const getRollupBuilder: BuilderFactory = async (workspace) => {
  const { fs, spawn } = workspace;

  const filenames = await fs
    .find(['rollup.config*.*', 'src/rollup.config*.*'])
    .then((entries) => {
      return entries.map((entry) => {
        return fs.relative(entry.fullpath());
      });
    });

  if (!filenames.length) return null;

  const rollup = async (
    watch: boolean,
    log: Log,
    filename: string,
  ): Promise<void> => {
    await spawn(
      'rollup',
      [
        watch && '--watch',
        '--config',
        filename,
        filename.endsWith('.ts') && ['--configPlugin', 'typescript'],
      ],
      { log, output: 'echo' },
    );
  };

  return new Builder('rollup', workspace, {
    build: rollup.bind(null, false),
    start: rollup.bind(null, true),
    matrix: filenames,
  });
};
