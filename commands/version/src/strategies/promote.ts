import semver from 'semver';
import { type Workspace } from 'wurk';

export const promote = async (workspace: Workspace): Promise<void> => {
  const { log, version, config } = workspace;

  if (!version || !semver.prerelease(version)?.length) {
    log.info`workspace is unversioned or non-prerelease versioned`;
    return;
  }

  const newVersion = new semver.SemVer(version)
    .inc('patch')
    .format();

  log.info`promoting prerelease version (${version} -> ${newVersion})`;
  config
    .at('version')
    .set(newVersion);
};
