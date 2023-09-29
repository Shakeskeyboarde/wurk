import { type SemVer } from 'semver';

import { type Change, ChangeType } from './get-changes.js';

export const getExplicitVersion = (spec: SemVer): [version: string, changes: readonly Change[]] => {
  const version = spec.format();
  const changes = [{ type: ChangeType.note, message: `Set version to "${version}".` }];

  return [version, changes];
};
