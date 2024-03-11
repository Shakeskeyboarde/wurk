import nodeFs from 'node:fs/promises';
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
  const { log, dir, config, version, spawn, getDependencyLinks } = workspace;

  if (!(await validate(pm, git, workspace, published))) {
    log.info('not publishing');
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

  const head = await git?.getHead(dir);

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
  const configFilename = nodePath.resolve(dir, 'package.json');
  const savedConfig = await nodeFs.readFile(configFilename, { encoding: 'utf8' });

  try {
    await nodeFs.writeFile(configFilename, config.toString());
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
    await nodeFs.writeFile(configFilename, savedConfig);
  }

  published.add(workspace);
};

const validate = async (
  pm: PackageManager,
  git: Git | null,
  workspace: Workspace,
  published: Set<Workspace>,
): Promise<boolean> => {
  const {
    log,
    dir,
    name,
    version,
    isPrivate,
    spawn,
    getEntrypoints,
    getDependencyLinks,
  } = workspace;

  if (isPrivate) {
    log.info`workspace is private`;
    return false;
  }

  if (!version) {
    log.info`workspace is unversioned`;
    return false;
  }

  const meta = await pm.getMetadata(name, version);

  if (meta) {
    log.info`workspace is already published`;
    return false;
  }

  if (await git?.getIsDirty(dir)) {
    throw new Error('workspace has uncommitted changes');
  }

  const changelogFilename = nodePath.resolve(dir, 'CHANGELOG.md');
  const changelog = await nodeFs.readFile(changelogFilename, { encoding: 'utf8' });

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
          .relative(entry.filename, nodePath.resolve(dir, packEntry.path))
          .startsWith('..');
      });
    });

  if (missingPackEntrypoints.length) {
    missingPackEntrypoints.forEach(({ type, filename }) => {
      log.error`missing ${type} "${nodePath.relative(dir, filename)}"`;
    });
    throw new Error('missing packed entry points');
  }

  let hasValidDependencies = true;

  for (const link of getDependencyLinks()) {
    if (!await validateDependency(pm, git, workspace, link, published)) {
      hasValidDependencies = false;
    }
  }

  return hasValidDependencies;
};

const validateDependency = async (
  pm: PackageManager,
  git: Git | null,
  workspace: Workspace,
  { type, spec, dependency }: WorkspaceLink,
  published: Set<Workspace>,
): Promise<boolean> => {
  const { log } = workspace;
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
    if (spec.protocol !== 'file') {
      // Dependencies on non-file URLs (eg. `git`, `https`) are not local
      // dependencies.
      return true;
    }

    throw new Error(`dependency "${name}" is local path`);
  }

  if (!version) {
    throw new Error(`dependency "${name}" is unversioned`);
  }

  if (isPrivate) {
    throw new Error(`dependency "${name}" is private`);
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
    throw new Error(`dependency "${name}" min-version does not match workspace version`);
  }

  if (!published.has(dependency)) {
    const meta = await pm.getMetadata(name, version);

    if (!meta) {
      log.info(`dependency "${name}" version is not published`);
      return false;
    }

    if (git) {
      if (await git.getIsDirty(dir)) {
        throw new Error(`dependency "${name}" has uncommitted changes`);
      }

      if (meta.gitHead) {
        const head = await git.getHead(dir);

        if (head) {
          if (head !== meta.gitHead) {
            log.info(`dependency "${name}" Git head does not match published head`);
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
