import { spawn } from '../utils/spawn.js';

export const getGitIsModified = async (dir: string, commit: string): Promise<boolean> => {
  return await spawn('git', ['diff', '--name-only', `${commit}..HEAD`, '--', dir], {
    cwd: dir,
    capture: true,
    errorThrow: true,
    errorMessage: () => `Not a Git repository: ${dir}`,
  })
    .getOutput('utf-8')
    .then((output) => output.length > 0);
};
