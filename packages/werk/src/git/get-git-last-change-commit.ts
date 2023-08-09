import { spawn } from '../utils/spawn.js';

export const getGitLastChangeCommit = async (dir: string): Promise<string | undefined> => {
  return await spawn('git', ['log', '-n', '1', '--pretty=format:%H', '.'], {
    capture: true,
    cwd: dir,
  })
    .getOutput('utf-8')
    .catch(() => undefined);
};
