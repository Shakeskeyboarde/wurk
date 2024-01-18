import assert from 'node:assert';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { createCommand, findAsync } from '@werk/cli';

export default createCommand({
  config: (commander) => {
    return commander
      .argument('[args...]', 'Arguments to pass to Vitest.')
      .helpOption(false)
      .option('--no-build', 'Skip building before testing.')
      .option('-h, --help', 'Print Vitest help.')
      .allowExcessArguments()
      .allowUnknownOption();
  },

  before: async ({ log, args, opts, root, workspaces, spawn }) => {
    const [vitestArgs] = args;

    if (opts.build) {
      log.info('Running pre-test build.');

      const isBuilt = await spawn('npm', ['run', '--if-present', 'build'], {
        input: 'inherit',
        echo: 'inherit',
        errorReturn: true,
        errorSetExitCode: true,
      }).succeeded();

      if (!isBuilt) return;
    }

    if (opts.help) {
      await spawn('vitest', ['--help', ...vitestArgs], {
        input: 'inherit',
        echo: 'inherit',
        errorReturn: true,
        errorSetExitCode: true,
      });

      return;
    }

    log.info('Testing with Vitest.');

    let configFilename: string | undefined;

    if (await isVitestWorkspaceConfigFound(root.dir)) {
      log.warn('Preexisting workspaces config found. Filter options will not apply.');
    } else {
      const workspaceNames = await workspaces
        .filter(({ isSelected }) => isSelected)
        .mapAsync(({ dir }) => isVitestConfigFound(dir).then((isConfigured) => (isConfigured ? dir : undefined)))
        .then((results) => results.filter((result): result is string => Boolean(result)));

      assert(workspaceNames.length, 'No configs found in any selected workspace.');

      const tempDir = resolve(root.dir, 'node_modules', '.werk-command-vitest');

      configFilename = resolve(tempDir, 'vitest.workspace.json');

      await mkdir(tempDir, { recursive: true });
      await writeFile(configFilename, JSON.stringify(workspaceNames));
    }

    const result = await spawn(
      'vitest',
      [...(configFilename ? [`--workspace=${configFilename}`] : []), ...vitestArgs],
      {
        input: 'inherit',
        echo: 'inherit',
        errorSetExitCode: true,
        errorReturn: true,
      },
    );

    if (result.error instanceof Error && 'code' in result.error && result.error.code === 'ENOENT') {
      log.error('Vitest is not installed. Run `npm i -D vitest` to install it.');
    }
  },
});

const isVitestWorkspaceConfigFound = async (dir: string): Promise<boolean> => {
  return Boolean(
    await findAsync(
      [
        'vitest.workspace.ts',
        'vitest.workspace.js',
        'vitest.workspace.json',
        'vitest.projects.ts',
        'vitest.projects.js',
        'vitest.projects.json',
      ],
      (filename) =>
        stat(resolve(dir, filename))
          .then((stats) => stats.isFile())
          .catch(() => false),
    ),
  );
};

const isVitestConfigFound = async (dir: string): Promise<boolean> => {
  return Boolean(
    await findAsync(
      [
        'vite.config.ts',
        'vite.config.mts',
        'vite.config.cts',
        'vite.config.js',
        'vite.config.mjs',
        'vite.config.cjs',
        'vitest.config.ts',
        'vitest.config.mts',
        'vitest.config.cts',
        'vitest.config.js',
        'vitest.config.mjs',
        'vitest.config.cjs',
      ],
      (filename) =>
        stat(resolve(dir, filename))
          .then((stats) => stats.isFile())
          .catch(() => false),
    ),
  );
};
