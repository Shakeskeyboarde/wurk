import { type ReleaseType, SemVer } from 'semver';

export const getBumpedVersion = (version: string | SemVer, releaseType: ReleaseType, identifier?: string): SemVer => {
  version = new SemVer(version);
  return version.inc(releaseType, identifier);
};
