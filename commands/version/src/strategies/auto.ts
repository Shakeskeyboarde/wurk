import semver from 'semver';
import { type Workspace } from 'wurk';

import { type Change, getChanges } from '../change.js';

export const auto = async (
  workspace: Workspace,
): Promise<readonly Change[]> => {
  const { log, npm, git, config, version } = workspace;

  // Auto-versioning does not support workspaces without versions or with
  // prerelease versions.
  if (!version || semver.prerelease(version)?.length) {
    log.debug('skipping workspace (no version or prerelease version)');
    return [];
  }

  const meta = await npm.getMetadata();

  if (!meta) {
    log.info(`using existing version for initial release (${version})`);
    return [];
  }

  if (!meta.gitHead) {
    log.warn(
      'auto versioning requires a "gitHead" published to the NPM registry',
    );
    return [];
  }

  if (!(await git.getIsRepo())) {
    log.warn('auto versioning requires a Git repository');
    return [];
  }

  const { isConventional, releaseType, changes } = await getChanges(
    workspace,
    meta.gitHead,
  );

  if (!isConventional) {
    log.warn(`workspace has non-conventional commits`);
  }

  if (!releaseType) {
    log.info('no changes detected');
    return [];
  }

  const newVersion = new semver.SemVer(version).inc(releaseType).format();

  log.info(`detected ${releaseType} changes (${version} -> ${newVersion})`);
  config.at('version').set(newVersion);

  return changes;
};
