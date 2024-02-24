import { JsonAccessor, type Workspace } from 'wurk';

import { Builder } from '../builder.js';

export const getTscBuilder = async (
  workspace: Workspace,
): Promise<Builder | null> => {
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

    return flag ? [[flag, filename]] : [];
  });

  if (!matrix.length) return null;

  return new Builder('tsc', workspace, {
    build: async (log, args) => {
      await spawn('tsc', args, { log, output: 'echo' });
    },
    start: async (log, args) => {
      await spawn('tsc', [...args, '--watch'], { log, output: 'echo' });
    },
    matrix,
  });
};
