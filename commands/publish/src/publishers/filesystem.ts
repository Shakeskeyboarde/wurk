import nodeFs from 'node:fs/promises';
import nodePath from 'node:path';

import semver from 'semver';
import {
  type Git,
  type JsonAccessor,
  type Workspace,
  type WorkspaceLink,
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
  readonly pm: string;
  readonly git: Git | null;
  readonly published: Set<Workspace>;
}

export const publishFromFilesystem = async (context: Context, workspace: Workspace): Promise<void> => {
  const { options, git, published, pm } = context;
  const { toArchive = false, tag, otp, removePackageFields, dryRun = false } = options;
  const { log, dir, version } = workspace;

  if (!(await validate(git, workspace, published))) {
    log.info`not ${toArchive ? 'packing' : 'publishing'}`;
    return;
  }

  const head = await git?.getHead(dir);
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

  published.add(workspace);
};

const validate = async (
  git: Git | null,
  workspace: Workspace,
  published: Set<Workspace>,
): Promise<boolean> => {
  const {
    log,
    dir,
    version,
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

  const meta = await getPublished();

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

  let hasValidDependencies = true;

  for (const link of getDependencyLinks()) {
    if (!await validateDependency(git, workspace, link, published)) {
      hasValidDependencies = false;
    }
  }

  return hasValidDependencies;
};

const validateDependency = async (
  git: Git | null,
  workspace: Workspace,
  { type, spec, dependency }: WorkspaceLink,
  published: Set<Workspace>,
): Promise<boolean> => {
  const { log } = workspace;
  const { dir, name, version, isPrivate, getPublished } = dependency;

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
    const meta = await getPublished();

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
  head: string | undefined | null,
): JsonAccessor => {
  const { config, getDependencyLinks } = workspace;
  const patchedConfig = config.copy();

  // Update dependency version ranges.
  getDependencyLinks()
    .forEach(({ type, id, spec, dependency }) => {
      if (type === 'devDependencies') return;
      if (!dependency.version) return;
      if (spec.type !== 'npm') return;
      if (spec.range !== '*' && spec.range !== 'x') return;

      const newRange = `^${dependency.version}`;
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
