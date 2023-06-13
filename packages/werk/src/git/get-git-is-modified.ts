import { spawn } from '../utils/spawn.js';

export const getGitIsModified = async (dir: string, fromRevision: string, headRevision: string): Promise<boolean> => {
  return await spawn('git', ['diff', '--name-only', `${fromRevision}..${headRevision}`, '--', dir], {
    cwd: dir,
    capture: true,
    errorReturn: true,
  })
    .getOutput('utf-8')
    .then((output) => output.length > 0)
    .catch(() => false);
};
