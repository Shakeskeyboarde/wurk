import nodeAssert from 'node:assert';
import nodePath from 'node:path';

import semver from 'semver';
import {
  type Git,
  type PackageManager,
  type Workspace,
  type WorkspaceLink,
} from 'wurk';

interface Context {
  readonly options: {
    readonly toArchive?: boolean;
    readonly tag?: string;
    readonly otp?: string;
    readonly removePackageFields?: readonly string[];
    readonly dryRun?: boolean;
  };
  readonly pm: PackageManager;
  readonly git: Git | null;
  readonly workspace: Workspace;
  readonly published: Set<Workspace>;
}

export const publishFromFilesystem = async (context: Context): Promise<void> => {
  const { options, pm, git, workspace, published } = context;
  const { status, log, fs, config, version, spawn, getDependencyLinks } = workspace;

  status.set('pending');

  if (!(await validate(pm, git, workspace, published))) {
    return;
  }

  log.info`publishing version ${version} from filesystem to ${options.toArchive ? 'archive' : 'registry'}`;

  // Update dependency version ranges.
  getDependencyLinks()
    .forEach(({ type, id, spec, dependency }) => {
      if (type === 'devDependencies') return;
      if (!dependency.version) return;
      if (spec.type !== 'npm') return;
      if (spec.range !== '*' && spec.range !== 'x') return;

      const newRange = `^${dependency.version}`;
      const newSpec = spec.name === id ? newRange : `npm:${spec.name}@${newRange}`;

      config.at(type)
        .at(id)
        .set(newSpec);
    });

  // Remove fields from the package.json file.
  options.removePackageFields?.forEach((field) => {
    field
      .split('.')
      .reduce((current, part) => current.at(part), config)
      .set(undefined);
  });

  const head = await git?.getHead();

  if (head) {
    // Set "gitHead" in the package.json file. NPM publish should do this
    // automatically. But, it doesn't do it for packing. It's also not
    // documented well even though it is definitely added intentionally in v7.
    config
      .at('gitHead')
      .set(head);
  }

  /**
   * All package changes are temporary and will be reverted after publishing.
   */
  const savedPackageJson = await fs.readText('package.json');

  nodeAssert(savedPackageJson, 'failed to read package.json file');

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
  }
  finally {
    await fs.writeText('package.json', savedPackageJson);
  }

  published.add(workspace);
  status.set('success', `${options.toArchive ? 'pack' : 'publish'} ${version}`);
};

const validate = async (
  pm: PackageManager,
  git: Git | null,
  workspace: Workspace,
  published: Set<Workspace>,
): Promise<boolean> => {
  const {
    log,
    status,
    name,
    version,
    isPrivate,
    fs,
    spawn,
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

  const meta = await pm.getMetadata(name, version);

  if (meta) {
    log.info`workspace is already published`;
    status.set('skipped', 'already published');
    return false;
  }

  if (await git?.getIsDirty()) {
    log.warn`workspace has uncommitted changes`;
    status.set('warning', 'uncommitted changes');
    return false;
  }

  const changelog = await fs.readText('CHANGELOG.md');

  if (
    changelog
    && !changelog.includes(`# ${version} `)
    && !changelog.includes(`# ${version}\n`)
  ) {
    log.warn`changelog may be outdated`;
  }

  const [packed] = await spawn('npm', ['pack', '--dry-run', '--json'])
    .stdoutJson()
    .then((json) => {
      // If the NPM pack command returns an unexpected JSON structure, it
      // should cause an error.
      return json.value as [{ files: { path: string }[] }];
    });

  const missingPackEntrypoints = getEntrypoints()
    .filter((entry) => {
    // The entrypoint is missing if every pack filename mismatches the
    // filename.
      return packed.files.every((packEntry) => {
      // True if the pack filename does not "match" the entry filename. The
      // relative path starts with ".." if the pack filename is not equal to
      // and not a subpath of the entry filename.
        return nodePath
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
    if (!(await validateDependency(pm, git, workspace, link, published))) {
      return false;
    }
  }

  return true;
};

const validateDependency = async (
  pm: PackageManager,
  git: Git | null,
  workspace: Workspace,
  { type, spec, dependency }: WorkspaceLink,
  published: Set<Workspace>,
): Promise<boolean> => {
  const { log, status } = workspace;
  const { dir, name, version, isPrivate } = dependency;

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
    }
    else {
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

  if (isPrivate) {
    log.error`dependency "${name}" is private`;
    status.set('failure', `dependency private`);
    return false;
  }

  if (!semver.satisfies(version, spec.range)) {
    // The dependency version range is not satisfied by the local workspace,
    // so this is not a local dependency.
    return true;
  }

  // If a non-wildcard dependency version range is used, then the min-version
  // of the range should match the local workspace version.
  if (
    spec.range !== '*'
    && spec.range !== 'x'
    && semver
      .minVersion(spec.range)
      ?.format() !== version
  ) {
    log.error`dependency "${name}" min-version does not match workspace version`;
    status.set('failure', `dependency min-version`);
    return false;
  }

  if (!published.has(dependency)) {
    const meta = await pm.getMetadata(name, version);

    if (!meta) {
      log.error`dependency "${name}" is not published`;
      status.set('failure', `dependency unpublished`);
      return false;
    }

    if (git) {
      if (await git.getIsDirty(dir)) {
        log.warn`dependency "${name}" has uncommitted changes`;
        status.set('warning', `dependency uncommitted changes`);
        return false;
      }

      if (meta.gitHead) {
        const head = await git.getHead({ dir });

        if (head) {
          if (head !== meta.gitHead) {
            log.warn`dependency "${name}" is modified`;
            status.set('warning', `dependency modified`);
            return false;
          }
        }
        else {
          log.warn`dependency "${name}" has no Git head`;
        }
      }
      else {
        log.warn`dependency "${name}" has no published Git head`;
      }
    }
  }

  return true;
};
