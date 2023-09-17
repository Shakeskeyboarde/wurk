import assert from 'node:assert';

import { createCommand, type Log, type PackageJson, type Spawn, type Workspace } from '@werk/cli';
import { parse, type ReleaseType, SemVer } from 'semver';

import { getBumpedVersion } from './get-bumped-version.js';
import { getChangeVersion } from './get-change-version.js';
import { type Change, getChanges } from './get-changes.js';
import { getIncrementedVersion } from './get-incremented-version.js';
import { writeChangelog } from './write-changelog.js';

const workspaceVersionUpdates = new Map<string, string>();
const workspaceChanges = new Map<string, () => Promise<void>>();

export default createCommand({
  config: (commander) => {
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

  before: async ({ log, args, opts, forceWait }) => {
    forceWait();

    if (opts.preid && (args[0] instanceof SemVer || !args[0].startsWith('pre'))) {
      log.warn('Using --preid only has an effect with "pre*" bump types');
    }
  },

  each: async ({ log, args, opts, workspace, spawn }) => {
    const [spec] = args;
    const { note = [], preid, changelog, dryRun = false } = opts;

    let version = '';
    let changes: readonly Change[] = [];

    if (workspace.selected) {
      const isCurrentVersionPrerelease = Boolean(parse(workspace.version)?.prerelease?.length);

      assert(
        !isCurrentVersionPrerelease || (typeof spec === 'string' && spec.startsWith('pre')),
        `Workspace "${workspace.name}" cannot be bumped to a non-prerelease version.`,
      );

      if (spec instanceof SemVer) {
        [version, changes] = getExplicitVersion(spec);
      } else if (spec !== 'auto') {
        [version, changes] = getBumpVersion(spec, preid, workspace);
      } else if (!workspace.private) {
        [version, changes] = await getAutoVersion(log, workspace, spawn);
      }
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
    if (!workspace.private && dependencyUpdates && !version) {
      version = getIncrementedVersion(workspace.version).format();
      changes = [...changes, { type: 'note', message: 'Updated local dependencies.' }];
    }

    const isVersionUpdated = Boolean(version) && version !== workspace.version;

    if (isVersionUpdated) {
      workspaceVersionUpdates.set(workspace.name, version);
      packagePatches.push({ version: version });
      log.notice(`Updating workspace "${workspace.name}" version from "${workspace.version}" to "${version}".`);
    }

    // Add any additional changelog notes.
    if (note.length) {
      changes = [...changes, ...note.map((message) => ({ type: 'note', message }))];
    }

    const isPackageUpdated = Boolean(packagePatches.length);
    const isChangeLogUpdated = Boolean(isVersionUpdated && changelog && changes.length);

    if (!isPackageUpdated && !isChangeLogUpdated) return;

    workspaceChanges.set(workspace.name, async () => {
      if (dryRun) {
        await workspace.saveAndRestoreFile('package.json');
        await workspace.saveAndRestoreFile('CHANGELOG.md');
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

    if (workspaceVersionUpdates.size) {
      // Update the package lock file.
      await spawn('npm', ['update', ...workspaceVersionUpdates.keys()], { errorEcho: true });
    }
  },
});

const getExplicitVersion = (spec: SemVer): [version: string, changes: readonly Change[], allowBump: boolean] => {
  const version = spec.format();
  const changes = [{ type: 'note', message: `Updated to version "${version}".` }];

  return [version, changes, false];
};

const getBumpVersion = (
  spec: ReleaseType,
  preid: string | undefined,
  workspace: Workspace,
): [version: string, changes: readonly Change[], allowBump: boolean] => {
  const version = getBumpedVersion(workspace.version, spec, preid).format();
  const changes = [{ type: 'note', message: `Updated to version "${version}".` }];

  return [version, changes, false];
};

const getAutoVersion = async (
  log: Log,
  workspace: Workspace,
  spawn: Spawn,
): Promise<[version: string, changes: readonly Change[]]> => {
  const [isRepo, isClean] = await Promise.all([
    await workspace.getGitIsRepo(),
    await workspace.getGitIsClean({
      includeDependencyScopes: ['dependencies', 'peerDependencies', 'optionalDependencies'],
      excludeDependencyNames: [...workspaceChanges.keys()],
    }),
  ]);

  assert(isRepo, 'Auto versioning requires a Git repository.');

  if (!isClean) {
    log.warn('Auto versioning requires a clean Git working tree.');
    return [workspace.version, []];
  }

  const fromRevision = await workspace.getGitFromRevision();

  if (!fromRevision) {
    log.warn('Unable to determine a "from" Git revision. Using previous commit only.');
  }

  const [changes, isConventional] = await getChanges(fromRevision ?? 'HEAD~1', workspace.dir, spawn);

  if (!isConventional) {
    log.warn(`Workspace "${workspace.name}" has non-conventional commits.`);
  }

  const version = changes.length > 0 ? getChangeVersion(workspace.version, changes).format() : '';

  return [version, changes];
};

const getDependencyUpdates = (log: Log, workspace: Workspace): PackageJson | undefined => {
  let packagePatch: PackageJson | undefined;

  for (const scope of ['dependencies', 'peerDependencies', 'optionalDependencies', 'devDependencies'] as const) {
    for (const [depName, depRange] of Object.entries(workspace[scope])) {
      const depVersion = workspaceVersionUpdates.get(depName);

      // No update for this dependency.
      if (!depVersion) continue;

      // Not an updatable range.
      if (depRange === '*' || depRange === 'x' || depRange.startsWith('file:')) continue;

      const prefix = depRange.match(/^([=^~]|>=?)?\d+(?:\.\d+(?:\.\d+(?:-[^\s|=<>^~]*)?)?)?$/u)?.[1];

      if (prefix == null) {
        log.warn(`Dependency "${depName}@${depRange}" in workspace "${workspace.name}" is too complex to update.`);
        continue;
      }

      const newDepRange = `${prefix}${depVersion}`;

      packagePatch = {
        ...packagePatch,
        [scope]: { ...packagePatch?.[scope], [depName]: newDepRange },
      };

      log.debug(`Updating "${depName}" to "${newDepRange}" in workspace "${workspace.name}".`);
    }

    return packagePatch;
  }
};
