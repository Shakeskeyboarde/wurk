import { spawn } from '../utils/spawn.js';

export const getGitIsShallow = async (dir: string): Promise<boolean> => {
  return await spawn('git', ['rev-parse', '--is-shallow-repository'], {
    cwd: dir,
    capture: true,
    errorReturn: true,
  })
    .getOutput('utf-8')
    .then((output) => output !== 'false')
    .catch(() => false);
};
