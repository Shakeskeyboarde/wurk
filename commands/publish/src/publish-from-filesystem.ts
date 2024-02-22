import assert from 'node:assert';
import path from 'node:path';

import semver from 'semver';
import { type Workspace, type WorkspaceEntrypoint } from 'wurk';

interface PublishFromFilesystemContext {
  readonly options: {
    readonly toArchive?: boolean;
    readonly tag?: string;
    readonly otp?: string;
    readonly removePackageFields?: readonly string[];
    readonly dryRun?: boolean;
  };
  readonly workspace: Workspace;
}

const published = new WeakSet<Workspace>();

export const publishFromFilesystem = async ({ options, workspace }: PublishFromFilesystemContext): Promise<void> => {
  const { toArchive = false, tag, otp, removePackageFields = [], dryRun = false } = options;
  const { status, log, git, npm, fs, version, dir, getDependencyLinks, spawn } = workspace;

  status.set('pending');

  if (!version) {
    log.verbose(`skipping workspace without a version`);
    status.set('skipped', 'no version');
    return;
  }

  const isShallow = await git.getIsShallow();

  assert(!isShallow, `publishing is not allowed from a shallow Git repository`);

  const meta = await npm.getMetadata();

  if (meta && version === meta.version) {
    log.verbose(`skipping already published version`);
    status.set('skipped', 'version exists');
    return;
  }

  log.info(`publishing version ${version} from filesystem to ${options.toArchive ? 'archive' : 'registry'}`);

  if (await git.getIsDirty()) {
    log.warn(`skipping workspace with dirty working tree`);
    status.set('warning', 'dirty working tree');

    return;
  }

  const prodDependencyLinks = await Promise.all(
    getDependencyLinks({
      recursive: true,
      filter: ({ scope }) => scope !== 'devDependencies',
    }).map(async (link) => {
      const [isDirty, isModified] = await Promise.all([
        !published.has(link.dependency) && link.dependency.git.getIsDirty(),
        !published.has(link.dependency) && link.dependency.getIsModified(),
      ]);

      return { ...link, isDirty, isModified };
    }),
  );

  const dirtyDependencies = prodDependencyLinks.filter((link) => link.isDirty).map((link) => link.dependency);

  if (dirtyDependencies.length) {
    log.warn(`skipping workspace with dirty local dependencies:`);
    dirtyDependencies.forEach((dependency) => log.warn(`  - ${dependency.name}`));
    status.set('warning', 'dirty dependencies');

    return;
  }

  const modifiedDependencies = prodDependencyLinks.filter((link) => link.isModified).map((link) => link.dependency);

  if (modifiedDependencies.length) {
    log.warn(`skipping workspace with modified local dependencies:`);
    modifiedDependencies.forEach((dependency) => log.warn(`  - ${dependency.name}`));
    status.set('warning', 'dirty working tree');

    return;
  }

  const missingEntrypoints = await workspace.getMissingEntrypoints();

  if (missingEntrypoints.length) {
    log.error(`missing entry points:`);
    missingEntrypoints.forEach(({ type, filename }) => log.error(`  - ${path.relative(dir, filename)} (${type})`));
    status.set('failure', 'entry points');

    return;
  }

  if (await getIsChangelogOutdated(workspace)) {
    log.warn(`changelog may be outdated`);
  }

  const packageJson = await fs.readJson('package.json');

  // Temporarily update local production dependency versions to real versions.
  // File (file:) and wildcard versions should not be published to the
  // registry.
  prodDependencyLinks.forEach((link) => {
    const { dependency, scope, id, versionRange } = link;

    if (!dependency.version || dependency.version === semver.minVersion(versionRange)?.format()) {
      // Skip if the dependency has no version, or the minimum version of the
      // range is the same as the current version.
      return;
    }

    /**
     * Make a best attempt to use a range similar to the original.
     */
    const rangePrefix = versionRange.match(/^([~^]|>=?)?[a-zA-Z\d.-]+$/u)?.[1] ?? '^';

    /**
     * If the `id` is the same as the workspace `name`, then the spec is just
     * the version range (eg. `^1.0.0`). Otherwise, the spec must be an alias
     * (eg. `npm:<name>@^1.0.0`).
     *
     * See Also:
     * - https://docs.npmjs.com/cli/v10/using-npm/package-spec#aliases
     * - https://github.com/npm/rfcs/blob/main/implemented/0001-package-aliases.md
     */
    const spec =
      id === dependency.name
        ? `${rangePrefix}${dependency.version}`
        : `npm:${dependency.name}@${rangePrefix}${dependency.version}`;

    packageJson.at(scope).at(id).set(spec);
  });

  // Temporarily remove fields from the package.json file.
  removePackageFields.forEach((field) => {
    field
      .split('.')
      .reduce((current, part) => current.at(part), packageJson)
      .set(undefined);
  });

  // Temporarily set "gitHead" in the package.json file. NPM publish should do
  // this automatically. But, it doesn't do it for packing. It's also not
  // documented well even though it is definitely added intentionally in v7.
  packageJson.at('gitHead').set(await git.getHead());

  /**
   * All package changes are temporary and will be reverted after publishing.
   */
  const savedPackageJson = await fs.readText('package.json');

  try {
    await fs.writeJson('package.json', packageJson);
    await spawn(
      'npm',
      [
        toArchive ? 'pack' : 'publish',
        Boolean(tag) && `--tag=${tag}`,
        Boolean(otp) && `--otp=${otp}`,
        dryRun && '--dry-run',
      ],
      { output: 'echo' },
    );
  } finally {
    await fs.writeText('package.json', savedPackageJson);
  }

  published.add(workspace);

  const missingPackedEntrypoints = await getMissingPackFiles(workspace);

  if (missingPackedEntrypoints.length) {
    log.error(`unpublished entry points:`);
    missingPackedEntrypoints.forEach(({ type, filename }) =>
      log.error(`  - ${path.relative(dir, filename)} (${type})`),
    );
    status.set('warning', 'entry points');
  } else {
    status.set('success', version);
  }
};

const getIsChangelogOutdated = async (workspace: Workspace): Promise<boolean> => {
  const { log, git, fs, name, spawn } = workspace;
  const [lastCommit, isRepo] = await Promise.all([git.getHead(), git.getIsRepo()]);

  log.debug(`workspace "${name}" lastCommit=${lastCommit} isRepo=${isRepo}`);

  // Definitely outdated if there is no commit in the directory.
  if (isRepo && lastCommit == null) return true;

  // git diff-tree -1 -r --name-only --no-commit-id 19fb750136fadef9929ea9b54c0807c0d9b06216 -- CHANGELOG.md
  const [isChangelogPresent, isChangelogUpToDate] = await Promise.all([
    fs.exists('CHANGELOG.md'),
    spawn('git', ['diff-tree', '-1', '-r', '--name-only', '--no-commit-id', lastCommit, '--', 'CHANGELOG.md'])
      .stdoutText()
      .then(Boolean),
  ]);

  log.debug(`workspace "${name}" isChangelogUpToDate=${isChangelogUpToDate}`);

  return isChangelogPresent && !isChangelogUpToDate;
};

const getMissingPackFiles = async (workspace: Workspace): Promise<WorkspaceEntrypoint[]> => {
  const { fs, spawn, getEntrypoints } = workspace;
  const packData = await spawn('npm', ['pack', '--dry-run', '--json']).stdoutJson();
  const packFilenames = packData
    .at(0)
    .at('files')
    .as('array', [] as unknown[])
    .filter(
      (value): value is { path: string } =>
        typeof value === 'object' && value != null && 'path' in value && typeof value.path === 'string',
    )
    .map((value) => fs.resolve(value.path));
  const missing = getEntrypoints().filter(
    ({ filename }) => !packFilenames.some((packFilename) => path.relative(packFilename, filename) === ''),
  );

  return missing;
};
