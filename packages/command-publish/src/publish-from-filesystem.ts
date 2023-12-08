import assert from 'node:assert';
import { stat } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

import {
  type EachContext,
  type Log,
  type MutablePackageJson,
  type Spawn,
  type Workspace,
  WorkspaceDependencyScope,
  type WorkspaceEntryPoint,
} from '@werk/cli';

interface publishFromFilesystemOptions {
  log: Log;
  opts: {
    readonly toArchive?: true;
    readonly tag?: string;
    readonly otp?: string;
    readonly removePackageFields?: readonly string[];
    readonly dryRun?: true;
  };
  workspace: Workspace;
  workspaces: ReadonlyMap<string, Workspace>;
  spawn: EachContext<any, any, any>['spawn'];
  saveAndRestoreFile: EachContext<any, any, any>['saveAndRestoreFile'];
}

const published = new Set<string>();

export const publishFromFilesystem = async ({
  log,
  opts,
  workspace,
  spawn,
  saveAndRestoreFile,
}: publishFromFilesystemOptions): Promise<void> => {
  const { toArchive = false, tag, otp, removePackageFields = [], dryRun = false } = opts;
  const isShallow = await workspace.getGitIsShallow();

  assert(!isShallow, `Publishing is not allowed from a shallow Git repository.`);

  const [isPublished, blockingDependencies, isChangeLogOutdated] = await Promise.all([
    workspace.getNpmIsPublished(),
    workspace.localDependencies
      .filter((dependency) => dependency.isDirect)
      .filter((dependency) => dependency.scope !== WorkspaceDependencyScope.dev)
      .filter((dependency) => !published.has(dependency.workspace.name))
      .filterAsync((dependency) => dependency.workspace.getIsModified()),
    getIsChangeLogOutdated(log, workspace, spawn),
  ]);

  if (isPublished) {
    log.verbose(`Skipping already published version.`);
    workspace.setStatus('skipped', 'version exists');

    return;
  }

  log.info(`Publishing v${workspace.version} from filesystem to ${opts.toArchive ? 'archive' : 'registry'}.`);

  if (blockingDependencies.size) {
    log.warn(`Skipping workspace with modified (and unpublished) local dependencies:`);
    blockingDependencies.forEach((dependency) => log.warn(`  - ${dependency.workspace.name}`));
    workspace.setStatus('warning', 'skipped, modified dependencies');

    return;
  }

  if (isChangeLogOutdated) {
    log.warn(`Workspace has commits after changelog update. Changelog may be outdated.`);
  }

  const [isDirty, dirtyDependencies, missing, missingPacked] = await Promise.all([
    workspace.getGitIsDirty(),
    workspace.localDependencies
      .filter((dependency) => dependency.scope !== WorkspaceDependencyScope.dev)
      .filterAsync((dependency) => dependency.workspace.getGitIsDirty()),
    workspace.getMissingEntryPoints(),
    getMissingPackFiles(workspace, spawn),
  ]);

  if (isDirty || dirtyDependencies.size) {
    log.warn(`Skipping workspace with dirty local dependencies.`);
    workspace.setStatus('warning', 'skipped, dirty dependencies');

    return;
  }

  if (missing.length) {
    log.error(`Missing entry points:`);
    missing.forEach(({ type, filename }) => log.error(`  - ${relative(workspace.dir, filename)} (${type})`));
    workspace.setStatus('failure', 'entry points');
    process.exitCode ||= 1;

    return;
  }

  if (missingPacked.length) {
    log.error(`Unpublished entry points:`);
    missingPacked.forEach(({ type, filename }) => log.error(`  - ${relative(workspace.dir, filename)} (${type})`));
    workspace.setStatus('failure', 'entry points');
    process.exitCode ||= 1;

    return;
  }

  const dependenciesPatch: MutablePackageJson = {};

  /*
   * Temporarily update local dependency versions to real versions. File
   * (file:) and wildcard versions should not be published to the
   * registry.
   */
  workspace.localDependencies.forEach((dependency) => {
    const { name, version } = dependency.workspace;

    for (const scope of ['dependencies', 'peerDependencies', 'optionalDependencies'] as const) {
      if (!(name in workspace[scope])) continue;

      const range = workspace[scope][name]!;
      const rangePrefix = range.match(/^([~^]|>=?)?[a-zA-Z\d.-]+$/u)?.[1] ?? '^';

      dependenciesPatch[scope] = { ...dependenciesPatch[scope], [name]: `${rangePrefix}${version}` };
    }
  });

  const removeFieldPatches: Record<string, unknown>[] = removePackageFields.map((field) => {
    const parts = field.split('.').reverse();

    return (
      parts.reduce<Record<string, unknown> | undefined>((acc, part) => {
        return { [part]: acc };
      }, undefined) ?? {}
    );
  });

  /*
   * Temporarily set "gitHead" in the package.json file. NPM publish
   * should do this automatically. But, it doesn't do it for packing.
   * It's also not documented well even though it is definitely added
   * intentionally in v7.
   */
  const gitHead = await workspace.getGitHead();
  const gitHeadPatch = { gitHead };

  saveAndRestoreFile(workspace.dir, 'package.json');

  await workspace.patchPackageJson(dependenciesPatch, ...removeFieldPatches, gitHeadPatch);
  await spawn(
    'npm',
    [
      toArchive ? 'pack' : 'publish',
      Boolean(tag) && `--tag=${tag}`,
      Boolean(otp) && `--otp=${otp}`,
      dryRun && '--dry-run',
    ],
    {
      cwd: workspace.dir,
      echo: true,
    },
  );

  published.add(workspace.name);
  workspace.setStatus('success', workspace.version);
};

const getIsChangeLogOutdated = async (
  log: Log,
  workspace: Pick<Workspace, 'name' | 'dir' | 'getGitHead' | 'getGitIsRepo'>,
  spawn: Spawn,
): Promise<boolean> => {
  const [lastCommit, isRepo] = await Promise.all([workspace.getGitHead(), workspace.getGitIsRepo()]);

  log.debug(`Workspace "${workspace.name}" lastCommit=${lastCommit} isRepo=${isRepo}`);

  // Definitely outdated if there is no commit in the directory.
  if (isRepo && lastCommit == null) return true;

  // git diff-tree -1 -r --name-only --no-commit-id 19fb750136fadef9929ea9b54c0807c0d9b06216 -- CHANGELOG.md
  const [isChangeLogPresent, isChangeLogOutdated] = await Promise.all([
    stat(resolve(workspace.dir, 'CHANGELOG.md'))
      .then((stats) => stats.isFile())
      .catch(() => false),
    spawn(
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
      {
        cwd: workspace.dir,
        capture: true,
        errorEcho: true,
      },
    )
      .getOutput('utf-8')
      .then((value) => !value),
  ]);

  log.debug(`Workspace "${workspace.name}" changeLogOutdated=${isChangeLogOutdated}`);

  return isChangeLogPresent && isChangeLogOutdated;
};

const getMissingPackFiles = async (
  workspace: Pick<Workspace, 'name' | 'dir' | 'getEntryPoints'>,
  spawn: Spawn,
): Promise<WorkspaceEntryPoint[]> => {
  const packJson = await spawn('npm', ['pack', '--dry-run', '--json'], {
    /**
     * Must run in the workspace directory, rather than using the `-w`
     * option, so that the archive is placed in the workspace directory.
     */
    cwd: workspace.dir,
    capture: true,
  }).getJson<readonly { readonly files: readonly { readonly path: string }[] }[]>();
  const packed = (packJson?.[0]?.files ?? []).map(({ path }) => resolve(workspace.dir, path));
  const missing = workspace
    .getEntryPoints()
    .filter(({ filename }) => !packed.some((packedFilename) => relative(packedFilename, filename) === ''));

  return missing;
};
