import { memoize } from '../utils/memoize.js';
import { spawn } from '../utils/spawn.js';

export const getGitIsRepo = memoize(async (dir: string): Promise<boolean> => {
  return await spawn('git', ['status'], { cwd: dir })
    .then(() => true)
    .catch(() => false);
});
