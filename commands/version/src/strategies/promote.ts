import semver from 'semver';
import { type Workspace } from 'wurk';

export const promote = async (workspace: Workspace): Promise<void> => {
  const { log, version, config } = workspace;

  if (!version || !semver.prerelease(version)?.length) {
    log.debug('skipping workspace (no version or non-prerelease version)');
    return;
  }

  config.at('version').set(new semver.SemVer(version).inc('patch').format());
};
