import { spawn } from '../utils/spawn.js';

export const getIsGitUnmodified = async (dir: string, commit: string): Promise<boolean> => {
  return await spawn('git', ['diff', '--name-only', `${commit}..HEAD`, '--', dir], {
    cwd: dir,
    capture: true,
    errorThrow: false,
  })
    .getOutput('utf-8')
    .then((output) => output.length === 0)
    // If there's an error (eg. not a Git repo), then assume there are no changes.
    .catch(() => true);
};
