import { spawn } from '../utils/spawn.js';

export interface GitIgnoredOptions {
  readonly includeNodeModules?: boolean;
  readonly includeDotFiles?: boolean;
}

export const getGitIgnored = async (
  dir: string,
  { includeNodeModules = false, includeDotFiles = false }: GitIgnoredOptions = {},
): Promise<string[]> => {
  const text = await spawn('git', ['status', '--ignored', '--porcelain', dir], {
    cwd: dir,
    capture: true,
  }).getStdout('utf-8');

  let files = text.trim().replace(/^!! */gmu, '').split(/\r?\n/u).filter(Boolean);

  if (!includeNodeModules) {
    files = files.filter((file) => !/(?:^|[\\/])node_modules(?:[\\/]|$)/u.test(file));
  }

  if (!includeDotFiles) {
    files = files.filter((file) => !/(?:^|[\\/])\./u.test(file));
  }

  return files;
};
