import { type ReleaseType, SemVer } from 'semver';

import { type Change, ChangeType } from './change.js';

export const getVersionBumped = (
  version: string | SemVer,
  releaseType: ReleaseType,
  identifier?: string,
): [version: string, changes: readonly Change[]] => {
  const versionString = new SemVer(version).inc(releaseType, identifier).format();
  const changes = [{ type: ChangeType.note, message: `bump ${releaseType} to version "${versionString}"` }];

  return [versionString, changes];
};
