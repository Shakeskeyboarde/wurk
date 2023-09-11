import { stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { type Log, type Spawn, type Workspace } from '@werk/cli';

interface BuildViteOptions {
  readonly log: Log;
  readonly workspace: Workspace;
  readonly start: boolean;
  readonly isEsm: boolean;
  readonly isCjs: boolean;
  readonly spawn: Spawn;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultConfig = resolve(__dirname, '..', 'config', 'vite.config.ts');

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const loadViteOptionalPlugins = async () => {
  const [react, dts, refresh, svgr] = await Promise.all([
    // eslint-disable-next-line import/no-extraneous-dependencies
    import('@vitejs/plugin-react')
      .then((exports) => {
        /*
         * XXX: Current version (4.0.4) of "@vitejs/plugin-react" has a broken
         *      package.json configuration for ESM, which causes the `default`
         *      export to be the wrong type. The following is a workaround
         *      until the issue is fixed.
         */
        return exports.default as unknown as Extract<typeof exports.default | typeof exports.default.default, Function>;
      })
      .catch(() => undefined),
    // eslint-disable-next-line import/no-extraneous-dependencies
    import('vite-plugin-dts').then((exports) => exports.default).catch(() => undefined),
    // eslint-disable-next-line import/no-extraneous-dependencies
    import('vite-plugin-refresh').then((exports) => exports.default).catch(() => undefined),
    // eslint-disable-next-line import/no-extraneous-dependencies
    import('vite-plugin-svgr').then((exports) => exports.default).catch(() => undefined),
  ]);

  return { react, dts, refresh, svgr };
};

export const buildVite = async ({ log, workspace, start, isEsm, isCjs, spawn }: BuildViteOptions): Promise<void> => {
  const [config, optionalPlugins] = await Promise.all([
    Promise.all(
      ['vite.config.ts', 'vite.config.js']
        .map((filename) => resolve(workspace.dir, filename))
        .map((filename) =>
          stat(filename)
            .then((stats) => stats.isFile() && filename)
            .catch(() => false),
        ),
    ).then((results) => results.find((filename): filename is string => Boolean(filename))),
    loadViteOptionalPlugins(),
  ]);

  const isLib = isEsm || isCjs;
  const command = isLib || !start ? 'build' : 'serve';
  const watch = isLib && start ? '--watch' : null;
  const host = !isLib && start ? '--host' : null;

  log.notice(
    `${start ? 'Starting' : 'Building'} workspace "${workspace.name}" using Vite${
      command === 'serve' ? ' (10 second delay)' : ''
    }.`,
  );

  if (!optionalPlugins.react) log.warn('Plugin "@vite/plugin-react" is recommended.');
  if (!optionalPlugins.dts && isLib) log.warn('Plugin "vite-plugin-dts" is recommended.');
  if (!optionalPlugins.refresh) log.warn('Plugin "vite-plugin-refresh" is recommended.');
  if (!optionalPlugins.svgr) log.warn('Plugin "vite-plugin-svgr" is recommended.');

  if (command === 'serve') {
    await new Promise((res) => setTimeout(res, 10_000));
  }

  await spawn('vite', [command, watch, host, `--config=${config ?? defaultConfig}`], {
    echo: true,
    errorReturn: true,
    errorSetExitCode: true,
    env: {
      VITE_LIB_ESM: isEsm ? 'true' : undefined,
      VITE_LIB_CJS: isCjs ? 'true' : undefined,
    },
  });
};
