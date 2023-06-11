import { spawn } from '../utils/spawn.js';

export const getGitIsClean = async (dir: string): Promise<boolean> => {
  return await spawn('git', ['status', '--porcelain', dir], {
    cwd: dir,
    capture: true,
    errorMessage: () => `Not a Git repository: ${dir}`,
  })
    .getOutput('utf-8')
    .then((output) => output.length === 0);
};
