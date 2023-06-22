import assert from 'node:assert';
import { stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createCommand } from '@werk/cli';

export default createCommand({
  init: ({ commander }) => {
    return commander
      .argument('[args...]', 'Arguments to pass to Vitest.')
      .helpOption(false)
      .option('-h, --help')
      .allowUnknownOption();
  },

  before: async ({ log, args, opts, root, workspaces, spawn }) => {
    const [vitestArgs] = args;

    if (opts.help) {
      await spawn('vitest', ['--help', ...vitestArgs], {
        input: 'inherit',
        echo: 'inherit',
        errorSetExitCode: true,
        errorReturn: true,
      });

      return;
    }

    if (!(await isVitestWorkspaceConfigFound(root.dir))) {
      const filename = join(root.dir, 'vitest.workspace.json');
      const workspaceNames = await Promise.all(
        Array.from(workspaces.values()).map(({ dir }) =>
          isVitestConfigFound(dir).then((isConfigured) => (isConfigured ? dir : undefined)),
        ),
      ).then((results) => results.filter((result): result is string => Boolean(result)));

      assert(workspaceNames.length, 'No workspaces found with Vitest configuration.');

      await root.saveAndRestoreFile(filename);
      await writeFile(filename, JSON.stringify(workspaceNames));
    }

    const result = await spawn('vitest', vitestArgs, {
      input: 'inherit',
      echo: 'inherit',
      errorSetExitCode: true,
      errorReturn: true,
    });

    if (result.error instanceof Error && 'code' in result.error && result.error.code === 'ENOENT') {
      log.error('Vitest is not installed. Run `npm i -D vitest` to install it.');
    }
  },
});

const isVitestWorkspaceConfigFound = async (dir: string): Promise<boolean> => {
  return await Promise.all(
    [
      'vitest.workspace.ts',
      'vitest.workspace.js',
      'vitest.workspace.json',
      'vitest.projects.js',
      'vitest.projects.ts',
      'vitest.projects.json',
    ].map((filename) =>
      stat(join(dir, filename))
        .then((stats) => stats.isFile())
        .catch(() => false),
    ),
  ).then((results) => results.some(Boolean));
};

const isVitestConfigFound = async (dir: string): Promise<boolean> => {
  return await Promise.all(
    ['vite.config.ts', 'vite.config.js', 'vitest.config.ts', 'vitest.config.js'].map((filename) =>
      stat(join(dir, filename))
        .then((stats) => stats.isFile())
        .catch(() => false),
    ),
  ).then((results) => results.some(Boolean));
};
