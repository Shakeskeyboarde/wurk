import assert from 'node:assert';

import { createCommand, type PackageJson } from '@werk/cli';
import { type ReleaseType, SemVer } from 'semver';

import { getBumpedVersion } from './get-bumped-version.js';
import { getChangeVersion } from './get-change-version.js';
import { type Change, getChanges } from './get-changes.js';
import { getIncrementedVersion } from './get-incremented-version.js';
import { writeChangelog } from './write-changelog.js';

const versionUpdates = new Map<string, string>();

export default createCommand({
  init: ({ commander }) => {
    return commander
      .argument(
        '<spec>',
        'Bump type (patch, minor, major, prepatch, preminor, premajor, prerelease, auto) or version number.',
        (value): ReleaseType | 'auto' | SemVer => {
          switch (value) {
            case 'patch':
            case 'prepatch':
            case 'minor':
            case 'preminor':
            case 'major':
            case 'premajor':
            case 'prerelease':
            case 'auto':
              return value;
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
      .option('-p, --preid <id>', 'Add an identifier to prerelease bumps.')
      .option('--no-changelog', 'Do not generate a changelog.')
      .option('--dry-run', 'Display proposed version changes without writing files.');
  },

  before: async ({ log, args, opts, forceWait }) => {
    forceWait();

    if (opts.preid && (args[0] instanceof SemVer || args[0] === 'auto')) {
      log.warn('Using --preid with "auto" or a version number has no effect.');
    }
  },

  each: async ({ log, args, opts, workspace, spawn }) => {
    const [update] = args;
    const { preid, changelog, dryRun = false } = opts;

    let changes: readonly Change[] | undefined;
    let updatedVersion: string | undefined;
    let updatedDependencies:
      | Pick<PackageJson, 'dependencies' | 'peerDependencies' | 'optionalDependencies' | 'devDependencies'>
      | undefined;

    if (workspace.selected) {
      if (update instanceof SemVer) {
        updatedVersion = update.toString();
        changes = [{ type: 'note', message: `Updated to version "${updatedVersion}".` }];
      } else if (update === 'auto') {
        if (!workspace.private) {
          await Promise.all(
            [
              workspace,
              ...workspace.getLocalDependencies({
                scopes: ['dependencies', 'peerDependencies', 'optionalDependencies'],
              }),
            ].map(async ({ getGitIsRepo, getGitIsClean }) => {
              assert(await getGitIsRepo(), 'Auto versioning requires a Git repository.');
              assert(await getGitIsClean(), 'Auto versioning requires a clean Git working tree.');
            }),
          );

          const fromRevision = await workspace.getGitFromRevision();

          if (!fromRevision) log.warn('Unable to determine a "from" Git revision. Using previous commit only.');

          let isConventional: boolean;

          [changes, isConventional] = await getChanges(fromRevision ?? 'HEAD~1', workspace.dir, spawn);

          if (!isConventional) {
            log.warn(`Workspace "${workspace.name}" has non-conventional commits.`);
          }

          if (changes.length > 0) {
            updatedVersion = getChangeVersion(workspace.version, changes).toString();
          }
        }
      } else {
        updatedVersion = getBumpedVersion(workspace.version, update, preid).toString();
        changes = [{ type: 'note', message: `Updated to version "${updatedVersion}".` }];
      }
    }

    for (const scope of ['dependencies', 'peerDependencies', 'optionalDependencies', 'devDependencies'] as const) {
      for (const [depName, depRange] of Object.entries(workspace[scope])) {
        const depVersion = versionUpdates.get(depName);

        // No update for this dependency.
        if (!depVersion) continue;

        // If the workspace version wasn't updated, but a dependency was,
        // then we need to increment the workspace version.
        if (!updatedVersion && !workspace.private) {
          updatedVersion = getIncrementedVersion(workspace.version).toString();

          if (update === 'auto') {
            changes = [...(changes ?? []), { type: 'note', message: 'Updated local dependencies.' }];
          }
        }

        // Not an updatable range.
        if (depRange === '*' || depRange === 'x' || depRange.startsWith('file:')) continue;

        const prefix = depRange.match(/^(|=|>=?|\^|~)\d+(?:\.\d+(?:\.\d+(?:-[^\s|=<>^~]*)?)?)?$/u)?.[1];

        if (prefix == null) {
          log.warn(`Dependency "${depName}@${depRange}" in workspace "${workspace.name}" is too complex to update.`);
          continue;
        }

        const newDepRange = `${prefix}${depVersion}`;

        updatedDependencies = {
          ...updatedDependencies,
          [scope]: { ...updatedDependencies?.[scope], [depName]: newDepRange },
        };

        log.debug(`Updated "${depName}" to "${newDepRange}" in workspace "${workspace.name}".`);
      }
    }

    const patches: PackageJson[] = [];

    if (updatedVersion) {
      versionUpdates.set(workspace.name, updatedVersion);
      patches.push({ version: updatedVersion });
      log.notice(`Updating workspace "${workspace.name}" version from "${workspace.version}" to "${updatedVersion}".`);
    }

    if (updatedDependencies) {
      log.notice(`Updating workspace "${workspace.name}" dependencies.`);
      patches.push(updatedDependencies);
    }

    if (dryRun) {
      await workspace.saveAndRestoreFile('package.json');
      await workspace.saveAndRestoreFile('CHANGELOG.md');
    }

    if (patches.length) {
      await workspace.patchPackageJson(...patches);
    }

    if (updatedVersion && changelog && changes?.length) {
      log.notice(`Updating workspace "${workspace.name}" change log.`);

      if (!(await writeChangelog(workspace.name, workspace.dir, updatedVersion, changes))) {
        log.warn(`Version "${updatedVersion}" already exists in the workspace "${workspace.name}" change log.`);
      }
    }
  },

  after: async ({ spawn }) => {
    if (versionUpdates.size === 0) return;

    await spawn('npm', ['update', ...versionUpdates.keys()], { errorEcho: true });
  },
});
