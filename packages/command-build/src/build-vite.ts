import assert from 'node:assert';
import { stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { type Log, type Spawn, type Workspace } from '@werk/cli';
import { type LibraryFormats } from 'vite';

import { getViteConfigPlugins, type ViteConfigOptions } from './vite-config.js';

interface BuildViteOptions {
  readonly log: Log;
  readonly workspace: Workspace;
  readonly start: boolean;
  readonly isEsm: boolean;
  readonly isCjs: boolean;
  readonly spawn: Spawn;
}

const START_DELAY_SECONDS = 10;
const DEFAULT_CONFIG_FILE = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'config', 'vite.config.ts');

const getExistingFile = async (dir: string, filenames: string[]): Promise<string | undefined> => {
  return await Promise.all(
    filenames
      .map((filename) => resolve(dir, filename))
      .map((filename) =>
        stat(filename)
          .then((stats) => stats.isFile() && filename)
          .catch(() => false),
      ),
  ).then((results) => results.find((filename): filename is string => typeof filename === 'string'));
};

export const buildVite = async ({ log, workspace, start, isEsm, isCjs, spawn }: BuildViteOptions): Promise<void> => {
  let isLib = isEsm || isCjs;

  // eslint-disable-next-line import/no-extraneous-dependencies
  const vite = await import('vite');
  const customConfigFile = await getExistingFile(workspace.dir, ['vite.config.ts', 'vite.config.js']);

  if (customConfigFile) {
    const viteConfig = await vite.loadConfigFromFile({ command: 'build', mode: 'production' });
    isLib = Boolean(viteConfig?.config.build?.lib);
  } else {
    const plugins = await getViteConfigPlugins(workspace.dir);

    Object.entries(plugins)
      .filter(([, plugin]) => plugin == null)
      .forEach(([name]) => log.warn(`Plugin "${name}" is recommended.`));
  }

  const command = isLib || !start ? 'build' : 'serve';
  const watch = isLib && start ? '--watch' : null;
  const host = !isLib && start ? '--host' : null;

  log.notice(
    `${start ? 'Starting' : 'Building'} workspace "${workspace.name}" using Vite${
      command === 'serve' ? ` (${START_DELAY_SECONDS} second delay)` : ''
    }.`,
  );

  if (command === 'serve') {
    await new Promise((res) => setTimeout(res, START_DELAY_SECONDS * 1000));
  }

  const env: NodeJS.ProcessEnv = {};

  if (isLib && !customConfigFile) {
    const entry = await getExistingFile(workspace.dir, [
      'src/index.ts',
      'src/index.tsx',
      'src/index.js',
      'src/index.jsx',
    ]);

    assert(entry, `Could not find Vite library entry point for workspace "${workspace.name}".`);

    const config: ViteConfigOptions = {
      emptyOutDir: !watch,
      lib: {
        entry,
        formats: [isEsm && 'es', isCjs && 'cjs'].filter(Boolean) as LibraryFormats[],
        preserveModules: true,
      },
    };

    env.VITE_WERK_OPTIONS = JSON.stringify(config);
  }

  await spawn('vite', [command, watch, host, `--config=${customConfigFile ?? DEFAULT_CONFIG_FILE}`], {
    cwd: workspace.dir,
    echo: true,
    errorReturn: true,
    errorSetExitCode: true,
    env,
  });
};
