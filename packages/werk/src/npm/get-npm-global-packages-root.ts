import { memoize } from '../utils/memoize.js';
import { spawn } from '../utils/spawn.js';

export const getNpmGlobalPackagesRoot = memoize(
  /**
   * Memoized.
   */
  async (): Promise<string> => {
    return await spawn('npm', ['root', '-g'], {
      capture: true,
      errorThrow: true,
      errorMessage: () => 'No global NPM packages root found.',
    }).getStdout('utf-8');
  },
);
