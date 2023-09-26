import { spawn } from '../utils/spawn.js';

export const getGitHead = async (dir: string): Promise<string | undefined> => {
  try {
    let head = await spawn('git', ['log', '-n', '1', '--pretty=format:%H', '.'], {
      cwd: dir,
      capture: true,
    }).getOutput('utf-8');

    if (!head) {
      head = await spawn('git', ['rev-parse', 'HEAD'], {
        cwd: dir,
        capture: true,
      }).getOutput('utf-8');
    }

    return head || undefined;
  } catch (_error) {
    return undefined;
  }
};
