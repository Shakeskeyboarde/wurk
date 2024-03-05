import semver from 'semver';
import { type Workspace } from 'wurk';

import { type Change, ChangeType } from './change.js';

export const sync = (workspace: Workspace): Change[] => {
  const { log, config, getDependencyLinks } = workspace;
  const pending: (() => void)[] = [];

  getDependencyLinks().forEach(({ type, id, spec, dependency }) => {
    // The range is not updatable.
    if (spec.type !== 'npm') return;

    const newVersion = dependency.config.at('version').as('string');

    // Somehow, the version is not set. This shouldn't happen, but if it does
    // we can't update the local dependency version.
    if (!newVersion) return;

    // The range is a wildcard, which is never updated by the version command.
    if (spec.range === '*' || spec.range === 'x') return;

    // The version range minimum is already equal to the new version.
    if (semver.minVersion(spec.range)?.format() === newVersion) return;

    const prefix = spec.range.match(/^(>=|\^|~)\d\S*$/u)?.[1] ?? '^';
    const newRange = `${prefix}${newVersion}`;
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
    return [];
  }

  pending.forEach((update) => update());

  return [
    { type: ChangeType.note, message: 'update local dependency versions' },
  ];
};
