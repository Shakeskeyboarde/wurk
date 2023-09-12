import { rcompare } from 'semver';

import { memoize } from '../utils/memoize.js';
import { type PackageJson } from '../utils/package-json.js';
import { spawn } from '../utils/spawn.js';

export interface NpmMetadata {
  version: string;
  gitHead?: string;
  [key: string]: unknown;
}

export const getNpmMetadata = memoize(
  /**
   * Memoized.
   */
  async (name: string, maxVersion: string): Promise<NpmMetadata | undefined> => {
    const result = await spawn('npm', ['show', '--silent', '--json', `${name}@<=${maxVersion}`, 'version', 'gitHead'], {
      capture: true,
      errorReturn: true,
    });

    if (result.failed) return undefined;

    const data = result.getJson<PackageJson | PackageJson[]>();
    const metaArray = (Array.isArray(data) ? data : [data])
      .filter((entry): entry is NpmMetadata => typeof entry.version === 'string')
      .map(({ gitHead, ...entry }) => ({ ...entry, gitHead: typeof gitHead === 'string' ? gitHead : undefined }))
      .sort((a, b) => rcompare(a.version, b.version));

    const meta = metaArray[0];

    if (!meta) return undefined;

    const { version, gitHead: maybeGitHead } = meta;
    const gitHead = maybeGitHead ?? metaArray.find((entry) => entry.gitHead != null)?.gitHead;

    return { version, gitHead };
  },
  (name, version) => `${name}@${version}`,
);
