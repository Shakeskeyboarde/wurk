import { spawn } from '../utils/spawn.js';

export const getIsGitClean = async (dir: string): Promise<boolean> => {
  return await spawn('git', ['status', '--porcelain', dir], { cwd: dir, capture: true, errorThrow: false })
    .getOutput('utf-8')
    .then((output) => output.length === 0)
    // If there's an error (eg. not a Git repo), then assume the working tree is clean.
    .catch(() => true);
};
