import path from 'node:path';

import { JsonAccessor, type Log } from 'wurk';

import { Builder, type BuilderFactory } from '../builder.js';

export const getTscBuilder: BuilderFactory = async (workspace) => {
  const { fs, spawn } = workspace;

  const filenames = await fs
    .find(['tsconfig*.json', 'src/tsconfig*.json'])
    .then((entries) => {
      return entries.map((entry) => {
        return fs.relative(entry.fullpath());
      });
    });

  const configs = await Promise.all(
    filenames.map(async (filename) => {
      return {
        filename,
        json: await spawn('tsc', ['-p', filename, '--showConfig'])
          .stdoutJson()
          .catch(() => new JsonAccessor()),
      };
    }),
  );

  const matrix = configs.flatMap(({ filename, json }) => {
    const flag = json.at('references').exists()
      ? '-b'
      : !json.at('compilerOptions').at('noEmit').as('boolean')
        ? '-p'
        : null;

    return flag ? [{ flag, filename }] : [];
  });

  if (!matrix.length) return null;

  const tsc = async (
    watch: boolean,
    log: Log,
    options: { readonly flag: string; readonly filename: string },
  ): Promise<void> => {
    await spawn(
      'tsc',
      [watch && '--watch', options.flag, path.basename(options.filename)],
      { log, output: 'echo', cwd: path.dirname(options.filename) },
    );
  };

  return new Builder('tsc', workspace, {
    build: tsc.bind(null, false),
    start: tsc.bind(null, true),
    matrix,
  });
};
