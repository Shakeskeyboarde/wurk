import assert from 'node:assert';

import { type Log, type Spawn, type Workspace, WorkspaceDependencyScope } from '@werk/cli';
import { SemVer } from 'semver';

import { type Change, ChangeType, getChanges } from './get-changes.js';

enum VersionBump {
  none,
  patch,
  minor,
  major,
}

export const getAutoVersion = async (
  log: Log,
  workspace: Workspace,
  spawn: Spawn,
): Promise<[version: string, changes: readonly Change[]]> => {
  const isRepo = await workspace.getGitIsRepo();

  assert(isRepo, 'Auto versioning requires a Git repository.');

  const fromRevision = await workspace.getNpmHead();

  if (!fromRevision) {
    log.debug('Unable to determine a "from" Git revision. Assuming initial release.');
    return [workspace.version, []];
  }

  const [isDirty, dirtyDependencies] = await Promise.all([
    workspace.getGitIsDirty(),
    workspace.localDependencies
      .filter((dependency) => dependency.scope !== WorkspaceDependencyScope.dev)
      .filterAsync((dependency) => dependency.workspace.getGitIsDirty()),
  ]);

  if (isDirty || dirtyDependencies.size) {
    log.warn('Auto versioning requires a clean Git working tree.');
    return [workspace.version, []];
  }

  log.info('Detecting changes.');

  const [changes, isConventional] = await getChanges(fromRevision ?? 'HEAD~1', workspace.dir, spawn);

  if (!isConventional) {
    log.warn(`Workspace "${workspace.name}" has non-conventional commits.`);
  }

  const version = new SemVer(workspace.version);
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

  // Return an empty version to allow for other versioning strategies.
  if (bump === VersionBump.none) {
    log.info('No changes detected.');
    return ['', changes];
  }

  version.inc(bump === VersionBump.major ? 'major' : bump === VersionBump.minor ? 'minor' : 'patch').format();

  log.info(
    `${bump === VersionBump.major ? 'Major' : bump === VersionBump.minor ? 'Minor' : 'Patch'} changes detected.`,
  );

  log.info(`Bumping version to ${version.format()} (from ${workspace.version}).`);

  return [version.format(), changes];
};
