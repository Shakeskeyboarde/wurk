import { spawn } from '../utils/spawn.js';

export const getGitHead = async (dir: string): Promise<string | undefined> => {
  return await spawn('git', ['rev-parse', 'HEAD'], {
    cwd: dir,
    capture: true,
    errorMessage: () => `Not a Git repository: ${dir}`,
  }).getOutput('utf-8');
};
