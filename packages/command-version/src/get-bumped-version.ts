import { type ReleaseType, SemVer } from 'semver';

import { type Change, ChangeType } from './get-changes.js';

export const getBumpedVersion = (
  version: string | SemVer,
  releaseType: ReleaseType,
  identifier?: string,
): [version: string, changes: readonly Change[]] => {
  const versionString = new SemVer(version).inc(releaseType, identifier).format();
  const changes = [{ type: ChangeType.note, message: `Bump ${releaseType} to version "${versionString}".` }];

  return [versionString, changes];
};
