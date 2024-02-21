import { type SemVer } from 'semver';

import { type Change, ChangeType } from './change.js';

export const getVersionManual = (semver: SemVer): [version: string, changes: readonly Change[]] => {
  const version = semver.format();
  const changes = [{ type: ChangeType.note, message: `set version to "${version}"` }];

  return [version, changes];
};
