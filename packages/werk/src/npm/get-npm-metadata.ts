import { memoize } from '../utils/memoize.js';
import { type PackageJson } from '../utils/package-json.js';
import { spawn } from '../utils/spawn.js';

export type NpmMetadata = PackageJson & {
  gitHead?: string;
  werk?: { gitHead?: string };
};

export const getNpmMetadata = memoize(
  /**
   * Memoized.
   */
  async (name: string, version: string): Promise<NpmMetadata | undefined> => {
    const result = await spawn('npm', ['show', '--silent', '--json', `${name}@${version}`], {
      capture: true,
      errorReturn: true,
    });

    if (result.failed) return undefined;

    const meta = result.getJson<NpmMetadata>();

    if (typeof meta.gitHead !== 'string') delete meta.gitHead;
    if (typeof meta.werk !== 'object' || meta.work === null) delete meta.werk;
    if (typeof meta.werk?.gitHead !== 'string') delete meta.werk?.gitHead;

    return meta;
  },
  (name, version) => `${name}@${version}`,
);
