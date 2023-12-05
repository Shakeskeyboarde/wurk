import { relative, resolve } from 'node:path';

import { spawn } from '../utils/spawn.js';
import { getGitRoot } from './get-git-root.js';

export interface GitIgnoredOptions {
  readonly includeNodeModules?: boolean;
  readonly includeDotFiles?: boolean;
}

export const getGitIgnored = async (
  dir: string,
  { includeNodeModules = false, includeDotFiles = false }: GitIgnoredOptions = {},
): Promise<string[]> => {
  const [gitRoot, gitIgnoredText] = await Promise.all([
    await getGitRoot(dir),
    await spawn('git', ['status', '--ignored', '--porcelain', dir], {
      cwd: dir,
      capture: true,
    }).getStdout('utf-8'),
  ]);

  let ignored = gitIgnoredText.split(/\r?\n/u).flatMap((line): [string] | [] => {
    const match = line.match(/^!! (.*)$/u);
    return match ? [match[1]!] : [];
  });

  if (!includeNodeModules) {
    ignored = ignored.filter((file) => !/(?:^|[\\/])node_modules(?:[\\/]|$)/u.test(file));
  }

  if (!includeDotFiles) {
    ignored = ignored.filter((file) => !/(?:^|[\\/])\./u.test(file));
  }

  ignored = ignored.map((file) => relative(dir, resolve(gitRoot, file)));

  return ignored;
};
