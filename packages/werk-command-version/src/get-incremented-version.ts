import { SemVer } from 'semver';

export const getIncrementedVersion = (version: string | SemVer): SemVer => {
  version = new SemVer(version);

  return version.inc(version.prerelease.length > 0 ? 'prerelease' : 'patch');
};
