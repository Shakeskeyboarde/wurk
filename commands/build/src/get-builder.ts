import { type JsonAccessor } from '@wurk/json';
import { type Workspace } from 'wurk';

import { buildRollup } from './build-rollup.js';
import { buildScript } from './build-script.js';
import { buildTsc } from './build-tsc.js';
import { buildVite } from './build-vite.js';

interface BuildOptions {
  workspace: Workspace;
  root: Workspace;
}

const CONFIG_FILE_EXTENSIONS = ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs'] as const;

export const getBuilder = async ({
  root,
  workspace,
}: BuildOptions): Promise<((mode: 'build' | 'start') => Promise<void>) | null> => {
  const { config: rootConfig } = root;
  const { status, log, config } = workspace;
  const scripts = config.at('scripts');

  if (scripts.at('build').is('string') || scripts.at('start').is('string')) {
    return (mode) => (scripts.at(mode).is('string') ? buildScript({ workspace, scriptName: mode }) : Promise.resolve());
  }

  const rollupConfig = await detectRollup(workspace);

  if (rollupConfig) {
    return (mode) => buildRollup({ workspace, start: mode === 'start', ...rollupConfig });
  }

  const viteConfig = await detectVite(workspace);
  const isLib = isLibPackage(config);
  const isEsm = isLib && isEsmPackage(config);
  const isCjs = isLib && isCjsPackage(config);

  if (viteConfig) {
    return (mode) =>
      buildVite({
        workspace,
        start: mode === 'start',
        isEsm: isLib && isEsm,
        isCjs: isLib && isCjs,
        ...(viteConfig || {
          isIndexHtmlPresent: false,
          customConfigFile: undefined,
        }),
      });
  }

  if ([config, rootConfig].some((acc) => acc.at('devDependencies').at('typescript').is('string')) && isLib) {
    return (mode) => buildTsc({ root, workspace, start: mode === 'start', isEsm, isCjs });
  }

  log.debug(`no suitable builder available`);
  status.set('skipped', 'no builder');

  return null;
};

const hasDeepProp = (obj: unknown, test: (key: string, value: unknown) => boolean): boolean => {
  if (typeof obj !== 'object' || obj == null) return false;

  for (const [key, value] of Object.entries(obj)) {
    if (test(key, value)) return true;
    if (hasDeepProp(value, test)) return true;
  }

  return false;
};

const isEsmPackage = (config: JsonAccessor): boolean => {
  if (config.at('module').is('string')) return true;
  if (config.at('main').as('string')?.endsWith('.mjs')) return true;
  if (config.at('type').value === 'module') return true;

  const exports = config.at('exports').value;

  if (hasDeepProp(exports, (key) => key === 'import')) return true;
  if (hasDeepProp(exports, (_, value) => typeof value === 'string' && value.endsWith('.mjs'))) return true;

  const bin = config.at('bin');

  if (bin.as('string')?.endsWith('.mjs')) return true;
  if (hasDeepProp(bin.value, (_, value) => typeof value === 'string' && value.endsWith('.mjs'))) return true;

  return false;
};

const isCjsPackage = (config: JsonAccessor): boolean => {
  if (config.at('main').as('string')?.endsWith('.cjs')) return true;

  const type = config.at('type').as('string');

  if (type === 'commonjs' || type == null) return true;

  const exports = config.at('exports').value;

  if (hasDeepProp(exports, (key) => key === 'require')) return true;
  if (hasDeepProp(exports, (_, value) => typeof value === 'string' && value.endsWith('.cjs'))) return true;

  const bin = config.at('bin');

  if (bin.as('string')?.endsWith('.cjs')) return true;
  if (hasDeepProp(bin.value, (_, value) => typeof value === 'string' && value.endsWith('.cjs'))) return true;

  return false;
};

const isLibPackage = (config: JsonAccessor): boolean => {
  return (
    config.at('exports').exists() ||
    config.at('main').exists() ||
    config.at('module').exists() ||
    config.at('types').exists() ||
    config.at('bin').exists()
  );
};

const detectVite = async (
  workspace: Workspace,
): Promise<{ isIndexHtmlPresent: boolean; customConfigFile: string | undefined } | false> => {
  const isIndexHtmlPresent = await workspace.fs.exists('index.html');
  let customConfigFile: string | undefined;

  for (const ext of CONFIG_FILE_EXTENSIONS) {
    const filename = workspace.fs.resolve(`vite.config.${ext}`);

    if (await workspace.fs.exists(filename)) {
      customConfigFile = filename;
      break;
    }
  }

  if (workspace.config.at('devDependencies').at('vite').is('string') || isIndexHtmlPresent || customConfigFile) {
    return { isIndexHtmlPresent, customConfigFile };
  }

  return false;
};

const detectRollup = async (workspace: Workspace): Promise<{ customConfigFile: string } | false> => {
  for (const ext of CONFIG_FILE_EXTENSIONS) {
    const customConfigFile = workspace.fs.resolve(`rollup.config.${ext}`);

    if (await workspace.fs.exists(customConfigFile)) {
      return { customConfigFile };
    }
  }

  return false;
};
