import semver from 'semver';
import { type Workspace } from 'wurk';

import { type Change, ChangeType } from './change.js';

export const sync = (workspace: Workspace): Change[] => {
  const { log, config, version, isPrivate, getDependencyLinks } = workspace;
  const pending: (() => void)[] = [];
  const isOriginalVersion = version === config.at('version').as('string');

  let isOptional = true;

  getDependencyLinks().forEach(({ type, id, versionRange, dependency }) => {
    // The range is not updatable.
    if (
      !semver.validRange(versionRange) ||
      versionRange === '*' ||
      versionRange === 'x'
    )
      return;

    const newVersion = dependency.config.at('version').as('string');

    // Somehow, the version is not set. This shouldn't happen, but if it does
    // we can't update the local dependency version.
    if (!newVersion) return;

    // The version range minimum is already equal to the new version.
    if (semver.minVersion(versionRange)?.format() === newVersion) return;

    if (!semver.satisfies(newVersion, versionRange)) {
      // The new version is not compatible with the range, so the range must
      // be updated.
      isOptional = false;
    }

    const prefix = versionRange.match(/^(>=|\^|~)\d\S*$/u)?.[1] ?? '^';
    const spec = `${id !== dependency.name ? `npm:${dependency.name}@` : ''}${prefix}${newVersion}`;

    // Add the update to the pending list. It will only be applied if the
    // workspace is private, selected, or if some updates are required.
    pending.push(() => {
      log.debug(`updating ${type} "${id}" to "${spec}"`);
      config.at(type).at(id).set(spec);
    });
  });

  if (!pending.length) {
    log.debug('no local dependency updates required');
    return [];
  }

  if (isOptional) {
    log.debug(
      'all local dependency version ranges are satisfied by current dependency versions',
    );

    // Skip updates that aren't required in unselected public workspaces,
    // because it more closely matches the intent behind selecting workspaces,
    // and because it leads to less (unnecessary) publishing.
    if (!isPrivate && isOriginalVersion) {
      log.debug(
        'skipping optional local dependency updates (public and no version update)',
      );
      return [];
    }
  }

  pending.forEach((update) => update());

  // Increment the workspace version if workspace dependencies are being
  // updated, the workspace version has not already been updated by a
  // versioning strategy, and the workspace is not private.
  if (version && isOriginalVersion && !isPrivate) {
    config
      .at('version')
      .set(
        new semver.SemVer(version)
          .inc(semver.prerelease(version)?.length ? 'prerelease' : 'patch')
          .format(),
      );
  }

  return [
    { type: ChangeType.note, message: 'update local dependency versions' },
  ];
};
