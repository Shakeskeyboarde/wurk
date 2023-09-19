import { SemVer } from 'semver';

import { type Change, ChangeType } from './get-changes.js';

enum VersionBump {
  none,
  patch,
  minor,
  major,
}

export const getChangeVersion = (version: string | SemVer, changes: readonly Change[]): string => {
  version = new SemVer(version);

  const bump = changes.reduce((current, change) => {
    switch (change.type) {
      case ChangeType.none:
        return current;
      case ChangeType.breaking:
        return VersionBump.major;
      case ChangeType.feat:
        return Math.max(current, VersionBump.minor);
      default:
        return Math.max(current, VersionBump.patch);
    }
  }, VersionBump.none);

  if (bump === VersionBump.none) return '';

  return version.inc(bump === VersionBump.major ? 'major' : bump === VersionBump.minor ? 'minor' : 'patch').format();
};
