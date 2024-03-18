import semver from 'semver';
import { type Workspace } from 'wurk';

import { type ChangeSet } from '../change.js';

export const promote = async (workspace: Workspace): Promise<ChangeSet | null> => {
  const { log, version } = workspace;

  if (!version || !semver.prerelease(version)?.length) {
    log.info`workspace is unversioned or non-prerelease versioned`;
    return null;
  }

  const newVersion = new semver.SemVer(version)
    .inc('patch')
    .format();

  log.info`promoting prerelease version (${version} -> ${newVersion})`;

  return { version: newVersion };
};
