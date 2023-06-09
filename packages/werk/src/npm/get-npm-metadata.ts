import { memoize } from '../utils/memoize.js';
import { type PackageJson } from '../utils/package-json.js';
import { spawn } from '../utils/spawn.js';

export type NpmMetadata = PackageJson & {
  gitHead?: string;
};

export const getNpmMetadata = memoize(
  /**
   * Memoized.
   */
  async (name: string, version: string): Promise<NpmMetadata | undefined> => {
    return await spawn('npm', ['show', '--silent', `${name}@${version}`], {
      capture: true,
      errorThrow: true,
    })
      .getJson<NpmMetadata>()
      .then((value) => {
        console.log(value);
        if (typeof value.gitHead !== 'string') delete value.gitHead;
        return value;
      })
      .catch(() => undefined);
  },
  (name, version) => `${name}@${version}`,
);
