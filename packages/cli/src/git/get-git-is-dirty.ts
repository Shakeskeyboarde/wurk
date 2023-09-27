import { spawn } from '../utils/spawn.js';

export const getGitIsDirty = async (dir: string): Promise<boolean> => {
  return await spawn('git', ['status', '--porcelain', dir], {
    cwd: dir,
    capture: true,
  })
    .getOutput('utf-8')
    .then(Boolean);
};