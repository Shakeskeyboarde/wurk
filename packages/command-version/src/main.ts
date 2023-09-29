/* eslint-disable max-lines */
import assert from 'node:assert';

import { createCommand, type PackageJson } from '@werk/cli';
import { diff, parse, type ReleaseType, SemVer } from 'semver';

import { getAutoVersion } from './get-auto-version.js';
import { getBumpedVersion } from './get-bumped-version.js';
import { type Change, ChangeType } from './get-changes.js';
import { addUpdate, getDependencyUpdates, getUpdateNames } from './get-dependency-updates.js';
import { getExplicitVersion } from './get-explicit-version.js';
import { getIncrementedVersion } from './get-incremented-version.js';
import { writeChangelog } from './write-changelog.js';

const BUMP_TYPE = [
  'patch',
  'prepatch',
  'minor',
  'preminor',
  'major',
  'premajor',
  'prerelease',
  'auto',
] as const satisfies readonly (ReleaseType | 'auto')[];

const workspaceChanges = new Map<string, () => Promise<void>>();

export default createCommand({
  config: (commander) => {
    return commander
      .argument(
        '<spec>',
        'Bump type (patch, minor, major, prepatch, preminor, premajor, prerelease, auto) or version number.',
        (value): ReleaseType | 'auto' | SemVer => {
          if (value && !/\d/u.test(value)) {
            const bumpType = BUMP_TYPE.filter((spec) => spec.startsWith(value));

            if (bumpType.length === 1) return bumpType[0]!;

            if (bumpType && bumpType.length > 1) {
              throw new Error(
                `Version increment "${value}" is ambiguous. Did you mean one of the following?${bumpType.reduce(
                  (result, type) => `${result}\n  - ${type}`,
                  '',
                )}`,
              );
            }
          }

          try {
            return new SemVer(value);
          } catch {
            throw new Error(
              'Invalid bump type or version. Valid bump types are "patch", "prepatch", "minor", "preminor", "major", "premajor", "prerelease", and "auto".',
            );
          }
        },
      )
      .option(
        '-n, --note <message>',
        'Add a note to changelogs.',
        (value, previous: string[] | undefined): string[] | undefined =>
          value ? [...(previous ?? []), value] : previous,
      )
      .option('-p, --preid <id>', 'Add an identifier to prerelease bumps.')
      .option('--no-changelog', 'Do not generate changelogs.')
      .option('--dry-run', 'Display proposed version changes without writing files.')
      .passThroughOptions();
  },

  before: async ({ log, args, opts }) => {
    if (opts.preid && (args[0] instanceof SemVer || !args[0].startsWith('pre'))) {
      log.warn('Using --preid only has an effect with "pre*" bump types');
    }
  },

  each: async ({ log, args, opts, workspace, spawn, saveAndRestoreFile }) => {
    if (!workspace.isSelected) return;

    const [spec] = args;
    const { note = [], preid, changelog, dryRun = false } = opts;
    const isCurrentVersionPrerelease = Boolean(parse(workspace.version)?.prerelease?.length);

    assert(
      !isCurrentVersionPrerelease || (typeof spec === 'string' && spec.startsWith('pre')),
      `Workspace "${workspace.name}" cannot be bumped to a non-prerelease version.`,
    );

    let version = '';
    let changes: readonly Change[] = [];

    if (spec instanceof SemVer) {
      [version, changes] = getExplicitVersion(spec);
    } else if (spec !== 'auto') {
      [version, changes] = getBumpedVersion(workspace.version, spec, preid);
    } else if (!workspace.isPrivate) {
      [version, changes] = await getAutoVersion(log, workspace, spawn);
    }

    const packagePatches: PackageJson[] = [];
    const dependencyUpdates = getDependencyUpdates(log, workspace);

    if (dependencyUpdates) {
      packagePatches.push(dependencyUpdates);
      log.debug(`Updating workspace "${workspace.name}" dependencies.`);
    }

    /*
     * Increment the version of this workspace (the dependent) if all of
     * the following are true.
     *
     * - Non-private.
     * - Any dependencies have been updated.
     * - Version hasn't already been updated due to other changes.
     *
     * This will cause the current workspace to be republished with the
     * updated dependencies.
     */
    if (!workspace.isPrivate && dependencyUpdates && !version) {
      version = getIncrementedVersion(workspace.version).format();
      changes = [...changes, { type: ChangeType.note, message: 'Updated local dependencies.' }];
    }

    const releaseType = version ? diff(workspace.version, version) : null;

    if (releaseType) {
      addUpdate(workspace.name, version);
      packagePatches.push({ version: version });
      log.notice(`Updating workspace "${workspace.name}" version from "${workspace.version}" to "${version}".`);
    }

    // Add any additional changelog notes.
    if (note.length) {
      changes = [...changes, ...note.map((message) => ({ type: ChangeType.note, message }))];
    }

    const isPackageUpdated = Boolean(packagePatches.length);
    const isChangeLogUpdated = Boolean(releaseType && changelog && changes.length);

    if (!isPackageUpdated && !isChangeLogUpdated) return;

    workspaceChanges.set(workspace.name, async () => {
      if (dryRun) {
        saveAndRestoreFile(workspace.dir, 'package.json');
        saveAndRestoreFile(workspace.dir, 'CHANGELOG.md');
      }

      if (isPackageUpdated) {
        log.debug(`Writing workspace "${workspace.name}" package.`);
        await workspace.patchPackageJson(...packagePatches);
      }

      if (isChangeLogUpdated) {
        log.debug(`Writing workspace "${workspace.name}" changelog.`);

        if (!(await writeChangelog(workspace.name, workspace.dir, version, changes))) {
          log.warn(`Version "${version}" already exists in the workspace "${workspace.name}" changelog.`);
        }
      }
    });
  },

  after: async ({ log, spawn }) => {
    if (workspaceChanges.size === 0) {
      log.info('No versions updated.');
      return;
    }

    for (const change of workspaceChanges.values()) {
      await change();
    }

    const updatedNames = getUpdateNames();

    if (updatedNames.length) {
      // Update the package lock file.
      await spawn('npm', ['update', ...updatedNames], { errorEcho: true });
    }
  },
});
