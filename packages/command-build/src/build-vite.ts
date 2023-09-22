import { stat } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { findAsync, type Log, type Spawn, type Workspace } from '@werk/cli';

import { type ViteConfigOptions } from './vite-config.js';

interface BuildViteOptions {
  readonly log: Log;
  readonly workspace: Workspace;
  readonly watch: boolean;
  readonly isEsm: boolean;
  readonly isCjs: boolean;
  readonly isIndexHtmlPresent: boolean;
  readonly customConfigFile: string | undefined;
  readonly spawn: Spawn;
}

const START_DELAY_SECONDS = 10;
const DEFAULT_CONFIG_FILE = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'config', 'vite.config.mts');

export const buildVite = async ({
  log,
  workspace,
  watch,
  isEsm,
  isCjs,
  isIndexHtmlPresent,
  customConfigFile,
  spawn,
}: BuildViteOptions): Promise<boolean> => {
  let isLib = false;

  // eslint-disable-next-line import/no-extraneous-dependencies
  const vite = await import('vite');

  if (customConfigFile) {
    const viteConfig = await vite.loadConfigFromFile({ command: 'build', mode: 'production' });
    isLib = Boolean(viteConfig?.config.build?.lib);
  } else {
    isLib = isEsm || isCjs || !isIndexHtmlPresent;
  }

  const commandArg = isLib || !watch ? 'build' : 'serve';
  const watchArg = isLib && watch ? '--watch' : null;
  const hostArg = !isLib && watch ? '--host' : null;

  log.notice(
    `${watch ? 'Starting' : 'Building'} workspace "${workspace.name}" using Vite${
      commandArg === 'serve' ? ` (${START_DELAY_SECONDS} second delay)` : ''
    }.`,
  );

  if (commandArg === 'serve') {
    await new Promise((res) => setTimeout(res, START_DELAY_SECONDS * 1000));
  }

  const env: NodeJS.ProcessEnv = {};

  if (isLib && !customConfigFile) {
    const outputs = workspace.getEntryPoints();
    const basenames = [
      ...new Set(
        outputs.flatMap(({ filename }) => {
          const match = relative(resolve(workspace.dir, 'lib'), filename).match(/^(.*)\.[cm]?js$/u);
          return match ? [resolve(workspace.dir, 'src', match[1]!)] : [];
        }),
      ),
    ];

    const entry = [
      ...new Set(
        await Promise.all(
          basenames.map((value) => {
            return findAsync(
              ['.ts', '.tsx', '.js', '.jsx', '.svg'].map((ext) => `${value}${ext}`),
              (filename) =>
                stat(filename)
                  .then((stats) => stats.isFile())
                  .catch(() => false),
            );
          }),
        ),
      ),
    ].filter((filename): filename is string => Boolean(filename));

    const preserveModules = entry.every((filename) =>
      /[\\/]src[\\/][^\\/]+(?<![\\/]bundle)\.[^\\/.]+$/u.test(filename),
    );

    const config: ViteConfigOptions = {
      emptyOutDir: !watchArg,
      lib: {
        entry,
        formats: isEsm ? (isCjs ? ['es', 'cjs'] : ['es']) : isCjs ? ['cjs'] : ['es', 'cjs'],
        preserveModules,
      },
    };

    env.VITE_WERK_OPTIONS = JSON.stringify(config);
  }

  return await spawn('vite', [commandArg, watchArg, hostArg, `--config=${customConfigFile ?? DEFAULT_CONFIG_FILE}`], {
    cwd: workspace.dir,
    echo: true,
    errorReturn: true,
    errorSetExitCode: true,
    env,
  }).succeeded();
};
