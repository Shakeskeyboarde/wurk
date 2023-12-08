import { stat } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { findAsync, Log, type Spawn, type Workspace } from '@werk/cli';

import { type ViteConfigOptions } from './vite-config.js';

interface BuildConfig {
  readonly configFile: string;
  readonly lib?: {
    readonly format: 'es' | 'cjs';
    readonly isMultiTarget?: boolean;
  };
}

interface BuildViteOptions {
  readonly log: Log;
  readonly workspace: Workspace;
  readonly watch: boolean;
  readonly clean: boolean;
  readonly isEsm: boolean;
  readonly isCjs: boolean;
  readonly isIndexHtmlPresent: boolean;
  readonly customConfigFile: string | undefined;
  readonly spawn: Spawn;
}

const START_DELAY_SECONDS = 10;
const ENTRY_POINT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.svg'];

export const buildVite = async ({
  log,
  workspace,
  watch,
  isEsm,
  isCjs,
  isIndexHtmlPresent,
  customConfigFile,
  clean,
  spawn,
}: BuildViteOptions): Promise<boolean> => {
  log.info(watch ? `Starting Vite in watch mode.` : `Building with Vite.`);
  workspace.setStatus('pending', 'vite');

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

  if (commandArg === 'serve') {
    await new Promise((res) => setTimeout(res, START_DELAY_SECONDS * 1000));
  }

  const configs: BuildConfig[] = [];

  if (customConfigFile) {
    log.info(`Using custom config file: ${customConfigFile}`);
    configs.push({ configFile: customConfigFile });
  } else {
    log.info(`Using automatic config.`);
    const autoConfigFile = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'config', 'vite.config.mts');

    if (isLib) {
      if (isEsm) configs.push({ configFile: autoConfigFile, lib: { format: 'es', isMultiTarget: isCjs } });
      if (isCjs) configs.push({ configFile: autoConfigFile, lib: { format: 'cjs', isMultiTarget: isEsm } });
    } else {
      configs.push({ configFile: autoConfigFile });
    }
  }

  const build = async ({ configFile, lib }: BuildConfig): Promise<boolean> => {
    let env: Record<string, string> | undefined;
    let spawnLog = log;

    if (lib) {
      log.info(`Creating ${lib.format === 'es' ? 'ESM' : 'CommonJS'} library.`);

      const inputs = await getInputs(workspace);
      const isBundle = isBundleInputPresent(inputs);
      const outSubDir = lib?.isMultiTarget ? (lib.format === 'es' ? 'esm' : lib.format) : undefined;

      if (outSubDir) {
        spawnLog = new Log({ ...log, prefix: `${log.prefix}(${outSubDir})` });
      }

      env = {
        VITE_WERK_OPTIONS: JSON.stringify({
          outDir: outSubDir ? `lib/${outSubDir}` : 'lib',
          emptyOutDir: !watchArg && clean,
          lib: {
            entry: inputs,
            format: lib.format,
            preserveModules: !isBundle,
          },
        } as ViteConfigOptions),
      };
    } else {
      log.info(`Creating web application.`);
    }

    return await spawn('vite', [commandArg, watchArg, hostArg, `--config=${configFile}`], {
      log: spawnLog,
      cwd: workspace.dir,
      echo: true,
      errorReturn: true,
      errorSetExitCode: true,
      env,
    }).succeeded();
  };

  if (watch) {
    workspace.setStatus('success', 'vite');
    return await Promise.all(configs.map(build)).then((results) => results.every(Boolean));
  }

  let isSuccess = true;

  for (const config of configs) {
    if (!(await build(config))) {
      isSuccess = false;
      break;
    }
  }

  workspace.setStatus(isSuccess ? 'success' : 'failure', 'vite');

  return isSuccess;
};

const getInputs = async (workspace: Workspace): Promise<string[]> => {
  const outputs = workspace.getEntryPoints();
  const basenames = [
    ...new Set(
      outputs.flatMap(({ filename }) => {
        const match = relative(resolve(workspace.dir, 'lib'), filename).match(/^(.*)\.[cm]?js$/u);
        return match ? [resolve(workspace.dir, 'src', match[1]!.replace(/(?:cjs|esm)[\\/]/u, ''))] : [];
      }),
    ),
  ];

  const inputs = [
    ...new Set(
      await Promise.all(
        basenames.map((value) => {
          return findAsync(
            ENTRY_POINT_EXTENSIONS.map((ext) => `${value}${ext}`),
            (filename) =>
              stat(filename)
                .then((stats) => stats.isFile())
                .catch(() => false),
          );
        }),
      ),
    ),
  ].filter((filename): filename is string => Boolean(filename));

  return inputs;
};

const isBundleInputPresent = (inputs: string[]): boolean => {
  return inputs.some((input) => /(?:^|[\\/])bundle\.[^\\/.]+$/u.test(input));
};
