import semver from 'semver';
import { type Workspace } from 'wurk';

import { type Change, ChangeType } from './change.js';

export const sync = (workspace: Workspace): Change[] => {
  const { log, config, version, isPrivate, getDependencyLinks } = workspace;
  const pending: (() => void)[] = [];

  getDependencyLinks().forEach(({ type, id, spec, dependency }) => {
    // The range is not updatable.
    if (spec.type !== 'npm') return;

    const newDependencyVersion = dependency.config.at('version').as('string');

    // Somehow, the version is not set. This shouldn't happen, but if it does
    // we can't update the local dependency version.
    if (!newDependencyVersion) return;

    // The range is a wildcard, which is never updated by the version command.
    if (spec.range === '*' || spec.range === 'x') return;

    // The version range minimum is already equal to the new version.
    if (semver.minVersion(spec.range)?.format() === newDependencyVersion)
      return;

    const prefix = spec.range.match(/^(>=|\^|~)\d\S*$/u)?.[1] ?? '^';
    const newRange = `${prefix}${newDependencyVersion}`;
    const newSpec =
      spec.name === id ? newRange : `npm:${dependency.name}@${newRange}`;

    // Add the update to the pending list. It will only be applied if the
    // workspace is private, selected, or if some updates are required.
    pending.push(() => {
      log.debug`updating ${type} "${id}" to "${newSpec}"`;
      config.at(type).at(id).set(newSpec);
    });
  });

  if (!pending.length) {
    log.debug`no local dependency updates required`;
  } else {
    pending.forEach((update) => update());
  }

  const newVersion = config.at('version').as('string');
  const isVersionUpdated = Boolean(newVersion) && newVersion !== version;

  if (!isVersionUpdated && version && !isPrivate) {
    const isIncrementRequired = getDependencyLinks().some(({ dependency }) => {
      const newDependencyVersion = dependency.config.at('version').as('string');

      return (
        newDependencyVersion && newDependencyVersion !== dependency.version
      );
    });

    // If dependency versions are updated, then bump the workspace version
    // so that bug fixes in dependencies are picked up by consumers of
    // dependents.
    if (isIncrementRequired) {
      const newIncrementedVersion = new semver.SemVer(version)
        .inc(semver.prerelease(version)?.length ? 'prerelease' : 'patch')
        .format();

      config.at('version').set(newIncrementedVersion);
      log.info`increment version for dependency updates (${version} -> ${newIncrementedVersion})`;

      return [{ type: ChangeType.note, message: 'local dependencies updated' }];
    }
  }

  return [];
};
