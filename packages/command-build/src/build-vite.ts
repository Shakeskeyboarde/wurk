import { stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { findAsync, type Log, type Spawn, type Workspace } from '@werk/cli';

import { type ViteConfigOptions } from './vite-config.js';

interface BuildViteOptions {
  readonly log: Log;
  readonly workspace: Workspace;
  readonly start: boolean;
  readonly isEsm: boolean;
  readonly isCjs: boolean;
  readonly isIndexHtmlPresent: boolean;
  readonly customConfigFile: string | undefined;
  readonly spawn: Spawn;
}

const START_DELAY_SECONDS = 10;
const DEFAULT_CONFIG_FILE = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'config', 'vite.config.ts');
const ENTRY_BASENAMES = ['index', 'exports', 'main', 'bundle'] as const;
const ENTRY_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx'];
const ENTRIES = ENTRY_BASENAMES.flatMap(<TBasename extends string>(basename: TBasename) =>
  ENTRY_EXTENSIONS.map((ext) => ({ basename, filename: `src/${basename}.${ext}` })),
);

export const buildVite = async ({
  log,
  workspace,
  start,
  isEsm,
  isCjs,
  isIndexHtmlPresent,
  customConfigFile,
  spawn,
}: BuildViteOptions): Promise<void> => {
  let isLib = false;

  // eslint-disable-next-line import/no-extraneous-dependencies
  const vite = await import('vite');

  if (customConfigFile) {
    const viteConfig = await vite.loadConfigFromFile({ command: 'build', mode: 'production' });
    isLib = Boolean(viteConfig?.config.build?.lib);
  } else {
    isLib = isEsm || isCjs || !isIndexHtmlPresent;
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
    const entry = isIndexHtmlPresent
      ? undefined
      : await findAsync(
          ENTRIES.map(({ filename, ...value }) => ({ ...value, filename: resolve(workspace.dir, filename) })),
          (value) =>
            stat(value.filename)
              .then((stats) => stats.isFile())
              .catch(() => false),
        );

    const config: ViteConfigOptions = {
      emptyOutDir: !watch,
      lib: {
        entry: entry?.filename,
        formats: isEsm ? (isCjs ? ['es', 'cjs'] : ['es']) : isCjs ? ['cjs'] : ['es', 'cjs'],
        preserveModules: entry?.basename !== 'bundle',
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
