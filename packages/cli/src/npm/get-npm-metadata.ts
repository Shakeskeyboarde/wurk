import { rcompare } from 'semver';

import { spawn } from '../utils/spawn.js';

export interface NpmMetadata {
  version: string;
  gitHead?: string;
}

export const getNpmMetadata = async (name: string, maxVersion: string): Promise<NpmMetadata | undefined> => {
  const result = await spawn('npm', ['show', '--silent', '--json', `${name}@<=${maxVersion}`, 'version', 'gitHead'], {
    capture: true,
    errorReturn: true,
  });

  if (result.failed) return undefined;

  const data = result.getJson<NpmMetadata | NpmMetadata[]>();
  const metaArray = (Array.isArray(data) ? data : [data])
    .map(({ version, gitHead }) => ({ version, gitHead: typeof gitHead === 'string' ? gitHead : undefined }))
    .sort((a, b) => rcompare(a.version, b.version));

  const meta = metaArray[0];

  if (!meta) return undefined;

  const { version, gitHead: maybeGitHead } = meta;
  const gitHead = maybeGitHead ?? metaArray.find((entry) => entry.gitHead != null)?.gitHead;

  return { version, gitHead };
};
