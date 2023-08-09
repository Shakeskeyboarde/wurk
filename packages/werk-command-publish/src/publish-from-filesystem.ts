import assert from 'node:assert';
import { relative, resolve } from 'node:path';

import { type Log, type MutablePackageJson, type Spawn, type Workspace } from '@werk/cli';

interface publishFromFilesystemOptions {
  log: Log;
  opts: {
    readonly toArchive?: true;
    readonly tag?: string;
    readonly otp?: string;
    readonly removePackageFields?: readonly string[];
    readonly changelogCheck: boolean;
    readonly dryRun?: true;
  };
  workspace: Workspace;
  spawn: Spawn;
}

const published = new Set<string>();

export const publishFromFilesystem = async ({
  log,
  opts,
  workspace,
  spawn,
}: publishFromFilesystemOptions): Promise<void> => {
  const { toArchive = false, tag, otp, removePackageFields = [], changelogCheck, dryRun = false } = opts;
  const isShallow = await workspace.getGitIsShallow();

  assert(!isShallow, `Publishing is not allowed from a shallow Git repository.`);

  const [isPublished, isModified, isChangeLogOutdated] = await Promise.all([
    workspace.getNpmIsPublished(),
    workspace.getIsModified({
      includeDependencyScopes: ['dependencies', 'peerDependencies', 'optionalDependencies'],
      excludeDependencyNames: [workspace.name, ...published],
    }),
    changelogCheck && getIsChangeLogOutdated(log, workspace, spawn),
  ]);

  if (isPublished) {
    log.verbose(`Not publishing workspace "${workspace.name}@${workspace.version}" because it is already published.`);
    return;
  }

  if (isModified) {
    log.warn(
      `Not publishing workspace "${workspace.name}" because it has modified and unpublished local dependencies.`,
    );
    return;
  }

  if (isChangeLogOutdated) {
    log.warn(`Not publishing workspace "${workspace.name}" because the change log was not updated in the last commit.`);
    return;
  }

  const [isClean, isBuilt, isPackComplete] = await Promise.all([
    workspace.getGitIsClean({
      includeDependencyScopes: ['dependencies', 'peerDependencies', 'optionalDependencies'],
      excludeDependencyNames: [...published],
    }),
    workspace.getIsBuilt(),
    getIsPackComplete(log, workspace, spawn),
  ]);

  assert(isClean, `Workspace "${workspace.name}" has uncommitted changes.`);
  assert(isBuilt, `Workspace "${workspace.name}" is not built. Some package entry points do not exist.`);
  assert(
    isPackComplete,
    `Workspace "${workspace.name}" packed archive is incomplete. Some package entry points do not exist.`,
  );

  log.notice(`Publishing workspace "${workspace.name}@${workspace.version}"${opts.toArchive ? ' to archive' : ''}.`);

  const dependenciesPatch: MutablePackageJson = {};

  // Temporarily update local dependency versions to real versions. File
  // (file:) and wildcard versions should not be published to the
  // registry.
  for (const scope of ['dependencies', 'peerDependencies', 'optionalDependencies'] as const) {
    const dependencies = workspace.getLocalDependencies({ scopes: [scope] });

    for (const dependency of dependencies) {
      // Try to match the existing version range prefix, or default to "^".
      const rangePrefix = workspace[scope][dependency.name]?.match(/^(|~|^|>=?)[a-zA-Z0-9.-]+$/u)?.[1] ?? '^';

      dependenciesPatch[scope] = {
        ...dependenciesPatch[scope],
        [dependency.name]: `${rangePrefix}${dependency.version}`,
      };
    }
  }

  const removeFieldPatches: Record<string, unknown>[] = removePackageFields.map((field) => {
    const parts = field.split('.').reverse();

    return (
      parts.reduce<Record<string, unknown> | undefined>((acc, part) => {
        return { [part]: acc };
      }, undefined) ?? {}
    );
  });

  // Temporarily set "gitHead" in the package.json file. NPM publish
  // should do this automatically. But, it doesn't do it for packing.
  // It's also not documented well even though it is definitely added
  // intentionally in v7.
  const gitHead = await workspace.getGitHead();
  const gitHeadPatch = { gitHead };

  await workspace.saveAndRestoreFile('package.json');
  await workspace.patchPackageJson(dependenciesPatch, ...removeFieldPatches, gitHeadPatch);
  await spawn(
    'npm',
    [
      `--loglevel=${log.level.name}`,
      toArchive ? 'pack' : 'publish',
      Boolean(tag) && `--tag=${tag}`,
      Boolean(otp) && `--otp=${otp}`,
      dryRun && '--dry-run',
    ],
    { echo: true },
  );

  published.add(workspace.name);
};

const getIsChangeLogOutdated = async (
  log: Log,
  workspace: Pick<Workspace, 'name' | 'dir' | 'getGitLastChangeCommit'>,
  spawn: Spawn,
): Promise<boolean> => {
  const lastCommit = await workspace.getGitLastChangeCommit();

  log.debug(`Workspace "${workspace.name}" lastCommit=${lastCommit}`);

  // Definitely outdated if there is no commit in the directory.
  if (lastCommit == null) return true;

  // git diff-tree -1 -r --name-only --no-commit-id 19fb750136fadef9929ea9b54c0807c0d9b06216 -- CHANGELOG.md
  const isChangeLogOutdated = await spawn(
    'git',
    [
      'diff-tree',
      '-1',
      '-r',
      '--name-only',
      '--no-commit-id',
      lastCommit,
      '--',
      resolve(workspace.dir, 'CHANGELOG.md'),
    ],
    { capture: true, errorEcho: true },
  )
    .getOutput('utf-8')
    .then((value) => !value);

  log.debug(`Workspace "${workspace.name}" changeLogOutdated=${isChangeLogOutdated}`);

  return isChangeLogOutdated;
};

const getIsPackComplete = async (
  log: Log,
  workspace: Pick<Workspace, 'name' | 'dir' | 'getEntryPoints'>,
  spawn: Spawn,
): Promise<boolean> => {
  const packJson = await spawn('npm', ['pack', '--dry-run', '--json'], { capture: true }).getJson<
    readonly { readonly files: readonly { readonly path: string }[] }[]
  >();
  const packFiles = (packJson?.[0]?.files ?? []).map(({ path }) => resolve(workspace.dir, path));
  const isPackComplete = workspace
    .getEntryPoints()
    .every(({ filename }) => packFiles.some((packFile) => relative(packFile, filename) === ''));

  log.debug(`Workspace "${workspace.name}" packed=${isPackComplete}`);

  return isPackComplete;
};
