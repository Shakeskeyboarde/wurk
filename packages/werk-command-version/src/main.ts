import assert from 'node:assert';

import { createCommand, type Log, type PackageJson, type Spawn, type Workspace } from '@werk/cli';
import { type ReleaseType, SemVer } from 'semver';

import { getBumpedVersion } from './get-bumped-version.js';
import { getChangeVersion } from './get-change-version.js';
import { type Change, getChanges } from './get-changes.js';
import { getIncrementedVersion } from './get-incremented-version.js';
import { writeChangelog } from './write-changelog.js';

const versionUpdates = new Map<string, string>();
const isUpdated = new Set<string>();

export default createCommand({
  packageManager: ['npm'],

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
      .option(
        '-n, --note <message>',
        'Add a note to changelogs.',
        (value, previous: string[] | undefined): string[] | undefined =>
          value ? [...(previous ?? []), value] : previous,
      )
      .option('-p, --preid <id>', 'Add an identifier to prerelease bumps.')
      .option('--no-changelog', 'Do not generate changelogs.')
      .option('--dry-run', 'Display proposed version changes without writing files.');
  },

  before: async ({ log, args, opts, forceWait }) => {
    forceWait();

    if (opts.preid && (args[0] instanceof SemVer || args[0] === 'auto')) {
      log.warn('Using --preid with "auto" or a version number has no effect.');
    }
  },

  each: async ({ log, args, opts, workspace, spawn }) => {
    const [spec] = args;
    const { note = [], preid, changelog, dryRun = false } = opts;

    let updatedVersion: string | undefined;
    let changes: readonly Change[] | undefined;

    if (workspace.selected) {
      if (spec instanceof SemVer) {
        [updatedVersion, changes] = setVersion(spec);
      } else if (spec !== 'auto') {
        [updatedVersion, changes] = bumpVersion(spec, preid, workspace);
      } else if (!workspace.private) {
        [updatedVersion, changes] = await autoVersion(log, workspace, spawn);
      }
    }

    const updatedDependencies = updateDependencies(log, workspace);

    // Non-private workspace versions must be updated if there are local dependency updates.
    if (!workspace.private && !updatedVersion && updatedDependencies) {
      updatedVersion = getIncrementedVersion(workspace.version).toString();
      changes = [...(changes ?? []), { type: 'note', message: 'Updated local dependencies.' }];
    }

    if (note.length) {
      changes = [...(changes ?? []), ...note.map((message) => ({ type: 'note', message }))];
    }

    const patches: PackageJson[] = [];

    if (updatedVersion) {
      versionUpdates.set(workspace.name, updatedVersion);
      patches.push({ version: updatedVersion });
      log.notice(`Updating workspace "${workspace.name}" version from "${workspace.version}" to "${updatedVersion}".`);
    }

    if (updatedDependencies) {
      patches.push(updatedDependencies);
      log.notice(`Updating workspace "${workspace.name}" dependencies.`);
    }

    if (dryRun) {
      await workspace.saveAndRestoreFile('package.json');
      await workspace.saveAndRestoreFile('CHANGELOG.md');
    }

    if (patches.length) {
      isUpdated.add(workspace.name);
      await workspace.patchPackageJson(...patches);
    }

    if (updatedVersion && changelog && changes?.length) {
      log.notice(`Updating workspace "${workspace.name}" change log.`);
      isUpdated.add(workspace.name);

      if (!(await writeChangelog(workspace.name, workspace.dir, updatedVersion, changes))) {
        log.warn(`Version "${updatedVersion}" already exists in the workspace "${workspace.name}" change log.`);
      }
    }
  },

  after: async ({ spawn }) => {
    if (versionUpdates.size === 0) return;

    // Update the package lock file.
    await spawn('npm', ['update', ...versionUpdates.keys()], { errorEcho: true });
  },
});

const setVersion = (spec: SemVer): [version: string, changes: readonly Change[]] => {
  const version = spec.toString();
  const changes = [{ type: 'note', message: `Updated to version "${version}".` }];
  return [version, changes];
};

const bumpVersion = (
  spec: ReleaseType,
  preid: string | undefined,
  workspace: Workspace,
): [version: string, changes: readonly Change[]] => {
  const version = getBumpedVersion(workspace.version, spec, preid).toString();
  const changes = [{ type: 'note', message: `Updated to version "${version}".` }];
  return [version, changes];
};

const autoVersion = async (
  log: Log,
  workspace: Workspace,
  spawn: Spawn,
): Promise<[version: string | undefined, changes: readonly Change[]]> => {
  const [isRepo, isClean] = await Promise.all([
    await workspace.getGitIsRepo(),
    await workspace.getGitIsClean({
      includeDependencyScopes: ['dependencies', 'peerDependencies', 'optionalDependencies'],
      excludeDependencyNames: [...isUpdated],
    }),
  ]);

  assert(isRepo, 'Auto versioning requires a Git repository.');
  assert(isClean, 'Auto versioning requires a clean Git working tree.');

  const fromRevision = await workspace.getGitFromRevision();

  if (!fromRevision) {
    log.warn('Unable to determine a "from" Git revision. Using previous commit only.');
  }

  const [changes, isConventional] = await getChanges(fromRevision ?? 'HEAD~1', workspace.dir, spawn);

  if (!isConventional) {
    log.warn(`Workspace "${workspace.name}" has non-conventional commits.`);
  }

  const version = changes.length > 0 ? getChangeVersion(workspace.version, changes).toString() : undefined;

  return [version, changes];
};

const updateDependencies = (
  log: Log,
  workspace: Workspace,
): Pick<PackageJson, 'dependencies' | 'peerDependencies' | 'optionalDependencies' | 'devDependencies'> | undefined => {
  let updatedDependencies:
    | Pick<PackageJson, 'dependencies' | 'peerDependencies' | 'optionalDependencies' | 'devDependencies'>
    | undefined;

  for (const scope of ['dependencies', 'peerDependencies', 'optionalDependencies', 'devDependencies'] as const) {
    for (const [depName, depRange] of Object.entries(workspace[scope])) {
      const depVersion = versionUpdates.get(depName);

      // No update for this dependency.
      if (!depVersion) continue;

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

      log.debug(`Updating "${depName}" to "${newDepRange}" in workspace "${workspace.name}".`);
    }

    return updatedDependencies;
  }
};
