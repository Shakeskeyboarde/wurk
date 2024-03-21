import nodeFs from 'node:fs/promises';
import nodePath from 'node:path';

import semver from 'semver';
import {
  type DependencySpec,
  type Git,
  type JsonAccessor,
  type Workspace,
  type WorkspaceDependency,
  type WorkspaceLink,
  type WorkspacePublished,
} from 'wurk';

import { pack } from '../pack.js';
import { publish } from '../publish.js';
import { readTarFilenames } from '../tar.js';

interface Context {
  readonly options: {
    readonly tag?: string;
    readonly otp?: string;
    readonly dryRun?: boolean;
    readonly toArchive?: boolean;
    readonly removePackageFields?: readonly string[];
  };
  readonly git: Git | null;
  readonly pm: string;
  readonly published: Map<Workspace, WorkspacePublished>;
}

/**
 * Publish the workspace from the filesystem. This will always pack the
 * workspace into an archive first, so that the package can be validated
 * before publishing. The archive will then either be published to an NPM
 * registry, or moved to the workspace directory.
 */
export const publishFromFilesystem = async (context: Context, workspace: Workspace): Promise<void> => {
  const { options, git, pm, published } = context;
  const { toArchive = false, tag, otp, removePackageFields, dryRun = false } = options;
  const { log, dir, version } = workspace;

  if (!(await validateWorkspace(git, published, workspace))) {
    log.info`not ${toArchive ? 'packing' : 'publishing'}`;
    return;
  }

  const head = await git?.getHead(dir) ?? null;
  const savedConfig = await nodeFs.readFile(nodePath.resolve(dir, 'package.json'));
  const patchedConfig = patchConfig(workspace, removePackageFields, head);
  const configFilename = nodePath.resolve(dir, 'package.json');

  let tempArchiveFilename: string;

  try {
    await nodeFs.writeFile(configFilename, patchedConfig.toString(2));
    tempArchiveFilename = await pack({ pm, workspace, quiet: true });
  }
  finally {
    await nodeFs.writeFile(configFilename, savedConfig);
  }

  await validateArchive(workspace, tempArchiveFilename);

  if (toArchive) {
    // Just move the archive from the temp to the workspace directory.
    if (!dryRun) {
      await nodeFs.rename(tempArchiveFilename, nodePath.resolve(dir, nodePath.basename(tempArchiveFilename)));
    }

    log.info`packed version ${version}`;
  }
  else {
    // Publish the archive from the temp directory.
    await publish({ pm, workspace, archiveFilename: tempArchiveFilename, tag, otp, dryRun });

    log.info`published version ${version}`;
  }

  published.set(workspace, { version: version!, gitHead: head });
};

const validateWorkspace = async (
  git: Git | null,
  published: Map<Workspace, WorkspacePublished>,
  workspace: Workspace,
): Promise<boolean> => {
  const {
    log,
    dir,
    version,
    dependencies,
    isPrivate,
    getDependencyLinks,
    getPublished,
  } = workspace;

  if (isPrivate) {
    log.info`workspace is private`;
    return false;
  }

  if (!version) {
    log.info`workspace is unversioned`;
    return false;
  }

  const info = await getPublished();

  if (info?.version === version) {
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

  let hasValidDependencies = true;

  for (const dependency of dependencies) {
    if (!await validateDependency(dependency)) {
      hasValidDependencies = false;
    }
  }

  for (const link of getDependencyLinks()) {
    if (!await validateDependencyLink(git, published, workspace, link)) {
      hasValidDependencies = false;
    }
  }

  return hasValidDependencies;
};

const validateDependency = async (
  dependency: WorkspaceDependency,
): Promise<boolean> => {
  const { type, id, spec } = dependency;

  if (type === 'devDependencies') {
    // Dev dependencies are not used after publishing, so they don't need
    // validation.
    return true;
  }

  if (spec.type === 'url' && spec.protocol === 'file') {
    throw new Error(`dependency "${id}" refers to local path`);
  }

  // XXX: Not checking to see if the dependency is published. Your CI pipeline
  // should restore dependencies, thereby ensuring that they are published.

  return true;
};

const validateDependencyLink = async (
  git: Git | null,
  published: Map<Workspace, WorkspacePublished>,
  workspace: Workspace,
  link: WorkspaceLink,
): Promise<boolean> => {
  const { log } = workspace;
  const { type, spec, dependency } = link;
  const { dir, name, version, isPrivate, getPublished } = dependency;

  if (type === 'devDependencies') {
    // Dev dependencies are not used after publishing, so they don't need
    // validation.
    return true;
  }

  if (spec.type === 'url') {
    if (spec.protocol === 'file') {
      // Dependency is a local path, which would break if published.
      //
      // XXX: Should already have been checked by `validateDependency`, so
      // no error or warning, but publishing still needs to be blocked.
      return false;
    }

    // Dependencies on external URLs (eg. `git`, `https`) are not local.
    return true;
  }

  if (!version) {
    throw new Error(`local dependency "${name}" is unversioned`);
  }

  if (isPrivate) {
    throw new Error(`local dependency "${name}" is private`);
  }

  if (spec.type === 'npm' && !semver.satisfies(version, spec.range)) {
    // NPM Dependencies on version ranges which are not satisfied by the
    // local workspace are not local.
    //
    // XXX: This also covers the case where the range is a tag. The tag will
    // not be valid semver, and will therefore not satisfy the range, which
    // will match this condition.
    return true;
  }

  if (
    spec.type === 'workspace'
    && !semver.satisfies(version, spec.range)
    && spec.range !== '^'
    && spec.range !== '~'
  ) {
    // Workspace dependencies must have a range that is satisfied by the
    // local workspace version. That's the whole point of a workspace protocol
    // dependencies.
    throw new Error(`local dependency "${name}" version does not satisfy workspace reference`);
  }

  /*
    This is definitely a local dependency that is being satisfied by a local
    workspace. The dependency spec is either a version range, an npm protocol
    url a compatible version range, or a workspace protocol url.

    The problem is, that if that local dependency does not represent what is
    actually published, then this package could end up not working after its
    published.

    Even if the version range for the dependency in this workspace allows for
    earlier versions which are published, this workspace is working locally
    using the dependency's local workspace. If the dependency workspace isn't
    published, then we don't really know if it contains any breaking changes,
    because it's version may not have been updated to reflect those changes
    yet.

    So, this workspace can only be safely published if all of its local
    dependencies are also published with their current versions. And not just
    their current versions, but the local workspaces code (git head) must also
    be the same as the published version.
  */

  /**
   * Info about the version that is actually published, if any.
   */
  const info = published.get(dependency) ?? await getPublished();

  if (info?.version !== version) {
    log.info`local dependency "${name}" is unpublished`;
    return false;
  }

  if (git) {
    if (await git.getIsDirty(dir)) {
      log.warn`local dependency "${name}" has uncommitted changes`;
      return false;
    }

    if (!info.gitHead) {
      log.warn`local dependency "${name}" is published without a Git head`;
    }
    else {
      const head = await git.getHead(dir);

      if (!head) {
        // XXX: Not sure how this would happen. Maybe if the dependency
        // workspace is ignored?
        log.warn`local dependency "${name}" has no Git head`;
      }
      if (head !== info.gitHead) {
        log.info`local dependency "${name}" is published with different Git head`;
        return false;
      }
    }
  }

  return true;
};

const validateArchive = async (workspace: Workspace, archiveFilename: string): Promise<void> => {
  const { log, dir, getEntrypoints } = workspace;
  const packedFilenames = await readTarFilenames(archiveFilename);
  const missingPackEntrypoints = getEntrypoints()
    .filter((entry) => {
      // The entrypoint is missing if every pack filename mismatches the
      // filename.
      return packedFilenames.every((packedFilename) => {
        const packageFilename = nodePath.relative('package', packedFilename);
        const virtualFilename = nodePath.resolve(dir, packageFilename);

        // True if the entry filename does not "match" the virtual filename.
        // The relative path will start with ".." if the entry filename is not
        // equal to (or a parent path of) the virtual filename.
        return nodePath
          .relative(entry.filename, virtualFilename)
          .startsWith('..');
      });
    });

  if (missingPackEntrypoints.length) {
    missingPackEntrypoints.forEach(({ type, filename }) => {
      log.error`missing ${type} "${nodePath.relative(dir, filename)}"`;
    });

    throw new Error('archive is missing entry points');
  }
};

const patchConfig = (
  workspace: Workspace,
  removePackageFields: readonly string[] | undefined,
  head: string | null,
): JsonAccessor => {
  const { config, getDependencyLinks } = workspace;
  const patchedConfig = config.copy();

  // Update wildcard and `workspace:` protocol dependency specs to publishable
  // dependency specs.
  getDependencyLinks()
    .forEach(({ type, id, spec, dependency }) => {
      if (type === 'devDependencies') return;
      if (!dependency.version) return;
      if (spec.type !== 'npm' && spec.type !== 'workspace') return;

      const newRange = getUpdatedRange(spec, dependency.version);

      if (!newRange) return null;

      const newSpec = spec.name === id ? newRange : `npm:${spec.name}@${newRange}`;

      patchedConfig.at(type)
        .at(id)
        .set(newSpec);
    });

  // Remove fields from the package.json file.
  removePackageFields?.forEach((field) => {
    field
      .split('.')
      .reduce((current, part) => current.at(part), patchedConfig)
      .set(undefined);
  });

  if (head) {
    // Set "gitHead" in the package.json file. NPM publish should do this
    // automatically. But, it doesn't do it for packing. It's also not
    // documented well even though it is definitely added intentionally in v7.
    patchedConfig
      .at('gitHead')
      .set(head);
  }

  return patchedConfig;
};

const getUpdatedRange = (
  spec: Extract<DependencySpec, { readonly type: 'npm' | 'workspace' }>,
  currentVersion: string,
): string | null => {
  if (spec.type === 'npm') {
    switch (spec.range) {
      case '=*':
        return currentVersion;
      case '*':
      case '^*':
        return `^${currentVersion}`;
      case '~*':
        return `~${currentVersion}`;
    }
  }
  else if (spec.type === 'workspace') {
    switch (spec.range) {
      case '*':
        return currentVersion;
      case '^':
        return `^${currentVersion}`;
      case '~':
        return `~${currentVersion}`;
    }
  }

  return null;
};
