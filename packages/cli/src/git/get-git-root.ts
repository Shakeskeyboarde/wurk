import { spawn } from '../utils/spawn.js';

export const getGitRoot = async (dir: string): Promise<string> => {
  return await spawn('git', ['rev-parse', '--show-toplevel'], {
    cwd: dir,
    capture: true,
  }).getStdout('utf-8');
};
