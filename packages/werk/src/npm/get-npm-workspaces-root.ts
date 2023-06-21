import { memoize } from '../utils/memoize.js';
import { spawn } from '../utils/spawn.js';

export const getNpmWorkspacesRoot = memoize(
  /**
   * Memoized.
   */
  async (): Promise<string> => {
    return await spawn('npm', ['query', ':root', '--json'], { capture: true })
      .getJson<[{ workspaces: unknown; path: string; realpath?: string }?]>()
      .then((values) => values?.[0])
      .then((value) => value?.realpath ?? value?.path ?? process.cwd());
  },
);
