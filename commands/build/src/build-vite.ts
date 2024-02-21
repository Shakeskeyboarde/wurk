import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { type WurkConfigOptions } from '@wurk/vite-config';
import { type Workspace } from 'wurk';

interface BuildConfig {
  readonly configFile: string;
  readonly lib?: {
    readonly format: 'es' | 'cjs';
    readonly isMultiTarget?: boolean;
  };
}

interface BuildViteOptions {
  readonly workspace: Workspace;
  readonly start: boolean;
  readonly isEsm: boolean;
  readonly isCjs: boolean;
  readonly isIndexHtmlPresent: boolean;
  readonly customConfigFile: string | undefined;
}

const START_DELAY_SECONDS = 10;
const ENTRY_POINT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.svg'];

export const buildVite = async ({
  workspace,
  start,
  isEsm,
  isCjs,
  isIndexHtmlPresent,
  customConfigFile,
}: BuildViteOptions): Promise<void> => {
  const { status, log, spawn } = workspace;

  status.set('pending', 'vite');

  log.info(start ? `starting Vite in watch mode` : `building with Vite`);

  let isLib = false;

  // eslint-disable-next-line import/no-extraneous-dependencies
  const vite = await import('vite');

  if (customConfigFile) {
    const viteConfig = await vite.loadConfigFromFile({ command: 'build', mode: 'production' });
    isLib = Boolean(viteConfig?.config.build?.lib);
  } else {
    isLib = isEsm || isCjs || !isIndexHtmlPresent;
  }

  status.setDetail(isLib ? 'vite lib' : 'vite app');

  const commandArg = isLib || !start ? 'build' : 'serve';
  const watchArg = isLib && start ? '--watch' : null;
  const hostArg = !isLib && start ? '--host' : null;

  if (commandArg === 'serve') {
    await new Promise((res) => setTimeout(res, START_DELAY_SECONDS * 1000));
  }

  const configs: BuildConfig[] = [];

  if (customConfigFile) {
    log.info(`using custom config file "${customConfigFile}"`);
    configs.push({ configFile: customConfigFile });
  } else {
    log.info(`using automatic config`);
    const autoConfigFile = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
      'config',
      'vite.config.mts',
    );

    if (isLib) {
      if (isEsm) configs.push({ configFile: autoConfigFile, lib: { format: 'es', isMultiTarget: isCjs } });
      if (isCjs) configs.push({ configFile: autoConfigFile, lib: { format: 'cjs', isMultiTarget: isEsm } });
    } else {
      configs.push({ configFile: autoConfigFile });
    }
  }

  const build = async ({ configFile, lib }: BuildConfig): Promise<void> => {
    let env: Record<string, string | undefined> | undefined;
    let spawnLog = log;

    if (lib) {
      log.info(`creating ${lib.format === 'es' ? 'ESM' : 'CommonJS'} library`);

      const inputs = await getInputs(workspace);
      const isBundle = isBundleInputPresent(inputs);
      const outSubDir = lib?.isMultiTarget ? (lib.format === 'es' ? 'esm' : lib.format) : undefined;

      if (outSubDir) {
        spawnLog = log.clone({ prefix: `${log.prefix}(${outSubDir})` });
      }

      env = {
        WURK_VITE_OPTIONS: JSON.stringify({
          outDir: outSubDir ? `lib/${outSubDir}` : 'lib',
          lib: {
            entries: inputs,
            format: lib.format,
            preserveModules: !isBundle,
          },
        } satisfies WurkConfigOptions),
      };
    } else {
      log.info(`creating web application`);

      env = {
        WURK_VITE_OPTIONS: undefined,
      };
    }

    await spawn('vite', [commandArg, watchArg, hostArg, `--config=${configFile}`], {
      log: spawnLog,
      output: 'echo',
      env,
    });
  };

  if (start) {
    await Promise.all(configs.map(build));
    return;
  }

  for (const config of configs) {
    await build(config);
  }

  status.set('success');
};

const getInputs = async ({ fs, getEntrypoints }: Workspace): Promise<string[]> => {
  const entrypoints = getEntrypoints();
  const basenames = [
    ...new Set(
      entrypoints.flatMap(({ filename }) => {
        const match = path.relative(fs.resolve('lib'), filename).match(/^(.*)\.[cm]?js$/u);
        return match ? [fs.resolve('src', match[1]!.replace(/(?:cjs|esm)[\\/]/u, ''))] : [];
      }),
    ),
  ];
  const names = basenames.flatMap((name) => ENTRY_POINT_EXTENSIONS.map((ext) => `${name}${ext}`));
  const inputs: string[] = [];

  for (const name of names) {
    if (await fs.exists(name)) {
      inputs.push(name);
    }
  }

  return inputs;
};

const isBundleInputPresent = (inputs: string[]): boolean => {
  return inputs.some((input) => /(?:^|[\\/])bundle\.[^\\/.]+$/u.test(input));
};
