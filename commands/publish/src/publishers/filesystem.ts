import assert from 'node:assert';
import path from 'node:path';

import semver from 'semver';
import { type Workspace, type WorkspaceLink } from 'wurk';

interface PublishFromFilesystemContext {
  readonly options: {
    readonly toArchive?: boolean;
    readonly tag?: string;
    readonly otp?: string;
    readonly removePackageFields?: readonly string[];
    readonly dryRun?: boolean;
  };
  readonly workspace: Workspace;
  readonly published: Set<Workspace>;
}

export const publishFromFilesystem = async (
  context: PublishFromFilesystemContext,
): Promise<void> => {
  const { options, workspace, published } = context;
  const {
    status,
    log,
    fs,
    config,
    version,
    spawn,
    getGit,
    getDependencyLinks,
  } = workspace;

  status.set('pending');

  if (!(await validate(workspace, published))) {
    return;
  }

  log.info`publishing version ${version} from filesystem to ${options.toArchive ? 'archive' : 'registry'}`;

  // Update dependency version ranges so that the minimum version matches the
  // current version.
  getDependencyLinks().forEach(({ type, id, spec, dependency }) => {
    if (type === 'devDependencies') return;
    if (spec.type !== 'npm') return;
    if (!dependency.version) return;
    if (!semver.satisfies(dependency.version, spec.range)) return;

    const prefix = spec.range.match(/^(>=|\^|~)\d\S*$/u)?.[1] ?? '^';
    const newRange = `${prefix}${dependency.version}`;
    const newSpec =
      spec.name === id ? newRange : `npm:${spec.name}@${newRange}`;

    config.at(type).at(id).set(newSpec);
  });

  // Remove fields from the package.json file.
  options.removePackageFields?.forEach((field) => {
    field
      .split('.')
      .reduce((current, part) => current.at(part), config)
      .set(undefined);
  });

  const git = await getGit().catch(() => null);
  const head = await git?.getHead();

  if (head) {
    // Set "gitHead" in the package.json file. NPM publish should do this
    // automatically. But, it doesn't do it for packing. It's also not
    // documented well even though it is definitely added intentionally in v7.
    config.at('gitHead').set(head);
  }

  /**
   * All package changes are temporary and will be reverted after publishing.
   */
  const savedPackageJson = await fs.readText('package.json');

  assert(savedPackageJson, 'failed to read package.json file');

  try {
    await fs.writeJson('package.json', config);
    await spawn(
      'npm',
      [
        options.toArchive ? 'pack' : 'publish',
        Boolean(options.tag) && `--tag=${options.tag}`,
        Boolean(options.otp) && `--otp=${options.otp}`,
        options.dryRun && '--dry-run',
      ],
      { output: 'echo' },
    );
  } finally {
    await fs.writeText('package.json', savedPackageJson);
  }

  published.add(workspace);
  status.set('success', `${options.toArchive ? 'pack' : 'publish'} ${version}`);
};

const validate = async (
  workspace: Workspace,
  published: Set<Workspace>,
): Promise<boolean> => {
  const {
    log,
    status,
    version,
    isPrivate,
    fs,
    spawn,
    getNpm,
    getGit,
    getEntrypoints,
    getDependencyLinks,
  } = workspace;

  if (isPrivate) {
    log.info`workspace is private`;
    status.set('skipped', 'private');
    return false;
  }

  if (!version) {
    log.info`workspace is unversioned`;
    status.set('skipped', 'unversioned');
    return false;
  }

  const npm = await getNpm();
  const meta = await npm.getMetadata();

  if (version === meta?.version) {
    log.info`workspace is already published`;
    status.set('skipped', 'already published');
    return false;
  }

  const git = await getGit().catch(() => null);

  if (git && (await git.getIsDirty())) {
    log.warn`workspace has uncommitted changes`;
    status.set('warning', 'uncommitted changes');
    return false;
  }

  const changelog = await fs.readText('CHANGELOG.md');

  if (changelog && !changelog.includes(`# ${version}\n`)) {
    log.warn`changelog may be outdated`;
  }

  const [packed] = await spawn('npm', ['pack', '--dry-run', '--json'])
    .stdoutJson()
    .then((json) => {
      // If the NPM pack command returns an unexpected JSON structure, it
      // should cause an error.
      return json.value as [{ files: { path: string }[] }];
    });

  const missingPackEntrypoints = getEntrypoints().filter((entry) => {
    // The entrypoint is missing if every pack filename mismatches the
    // filename.
    return packed.files.every((packEntry) => {
      // True if the pack filename does not "match" the entry filename. The
      // relative path starts with ".." if the pack filename is not equal to
      // and not a subpath of the entry filename.
      return path
        .relative(entry.filename, fs.resolve(packEntry.path))
        .startsWith('..');
    });
  });

  if (missingPackEntrypoints.length) {
    log.error`missing packed entry points:`;
    missingPackEntrypoints.forEach(({ type, filename }) => {
      log.error`- ${fs.relative(filename)} (${type})`;
    });
    status.set('failure', 'entry points');
    return false;
  }

  for (const link of getDependencyLinks()) {
    if (!(await validateDependency(workspace, link, published))) {
      return false;
    }
  }

  return true;
};

const validateDependency = async (
  workspace: Workspace,
  { type, spec, dependency }: WorkspaceLink,
  published: Set<Workspace>,
): Promise<boolean> => {
  const { log, status } = workspace;
  const { name, version, isPrivate, getNpm, getGit } = dependency;

  if (type === 'devDependencies') {
    // Dev dependencies are not used after publishing, so they don't need
    // validation.
    return true;
  }

  if (spec.type === 'tag') {
    // Dependencies on tagged versions are not local dependencies.
    return true;
  }

  if (spec.type === 'url') {
    if (spec.protocol === 'file') {
      log.error`dependency "${name}" is local path`;
      status.set('failure', `dependency local path`);
      return false;
    } else {
      // Dependencies on non-file URLs (eg. `git`, `https`) are not local
      // dependencies.
      return true;
    }
  }

  if (!version) {
    log.error`dependency "${name}" is unversioned`;
    status.set('failure', `dependency unversioned`);
    return false;
  }

  if (!semver.satisfies(version, spec.range)) {
    // The dependency version range is not satisfied by the local workspace,
    // so this is not a local dependency.
    return true;
  }

  if (isPrivate) {
    log.error`dependency "${name}" is private`;
    status.set('failure', `dependency private`);
    return false;
  }

  if (!published.has(dependency)) {
    const npm = await getNpm();
    const meta = await npm.getMetadata();

    if (version !== meta?.version) {
      log.error`dependency "${name}" is not published`;
      status.set('failure', `dependency unpublished`);
      return false;
    }

    const git = await getGit().catch(() => null);

    if (git) {
      if (await git.getIsDirty()) {
        log.warn`dependency "${name}" has uncommitted changes`;
        status.set('warning', `dependency uncommitted changes`);
        return false;
      }

      if (meta.gitHead) {
        const head = await git.getHead();

        if (head) {
          if (head !== meta.gitHead) {
            log.warn`dependency "${name}" is modified`;
            status.set('warning', `dependency modified`);
            return false;
          }
        } else {
          log.warn`dependency "${name}" has no Git head`;
        }
      } else {
        log.warn`dependency "${name}" has no published Git head`;
      }
    }
  }

  return true;
};
