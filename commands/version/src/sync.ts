import semver from 'semver';
import { type Workspace } from 'wurk';

import { type Change, ChangeType } from './change.js';

export const sync = (workspace: Workspace): Change[] => {
  const { log, config, version, isPrivate, getDependencyLinks } = workspace;
  const updatedNames: string[] = [];

  getDependencyLinks().forEach(({ type, id, spec, dependency }) => {
    // The range is not updatable.
    if (spec.type !== 'npm') return;

    const newDependencyVersion = dependency.config.at('version').as('string');

    // Somehow, the version is not set. This shouldn't happen, but if it does
    // we can't update the local dependency version.
    if (!newDependencyVersion) return;

    if (newDependencyVersion !== dependency.version) {
      // Save the updated dependency name for the changelog, even if the
      // change is not applied to the dependent workspace config.
      updatedNames.push(dependency.name);
    }

    // The range is a wildcard, which is never updated by the version command.
    if (spec.range === '*' || spec.range === 'x') return;

    // The version range minimum is already equal to the new version.
    if (semver.minVersion(spec.range)?.format() === newDependencyVersion)
      return;

    const prefix = spec.range.match(/^(>=|\^|~)\d\S*$/u)?.[1] ?? '^';
    const newRange = `${prefix}${newDependencyVersion}`;
    const newSpec =
      spec.name === id ? newRange : `npm:${dependency.name}@${newRange}`;

    log.debug`updating ${type} "${id}" to "${newSpec}"`;
    config.at(type).at(id).set(newSpec);
  });

  if (!isPrivate && updatedNames.length && version) {
    const newVersion = config.at('version').as('string');
    const isVersionUpdated = Boolean(newVersion) && newVersion !== version;

    if (!isVersionUpdated) {
      const newIncrementedVersion = new semver.SemVer(version)
        .inc(semver.prerelease(version)?.length ? 'prerelease' : 'patch')
        .format();

      config.at('version').set(newIncrementedVersion);
      log.info`increment version for dependency updates (${version} -> ${newIncrementedVersion})`;
    }
  }

  if (!updatedNames.length) return [];

  return [
    {
      type: ChangeType.note,
      message: `local dependencies updated (${updatedNames.join(', ')})`,
    },
  ];
};
