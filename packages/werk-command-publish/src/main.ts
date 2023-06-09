import assert from 'node:assert';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';

import { createCommand, type MutablePackageJson, type Workspace, type WorkspaceContext } from '@werk/cli';

const resultPromises = new Map<string, Promise<{ isPublished: boolean }>>();
const workspacesToRestore: Workspace[] = [];

export default createCommand({
  init: ({ commander, command }) => {
    return commander
      .description(command.packageJson.description ?? '')
      .description('Only versions that do not exist in the registry are published.')
      .option('--to-archive', 'Pack each workspace into an archive.')
      .addOption(
        commander.createOption('--from-archive', 'Publish pre-packed workspace archives.').conflicts('toArchive'),
      )
      .option('--dry-run', 'Perform a dry run for validation.');
  },
  each: async (context) => {
    const promise = each(context);

    resultPromises.set(
      context.workspace.name,
      promise.catch(() => ({ isPublished: false })),
    );

    await promise;
  },
  cleanup: ({ log, spawn }) => {
    workspacesToRestore.forEach(({ name, dir }) => {
      if (spawn('git', ['restore', '--source=HEAD', '--staged', '--worktree', '--', dir], { echo: true }).failed) {
        log.warn(`Failed to restore workspace "${name}".`);
      }
    });
  },
});

const each = async (
  context: WorkspaceContext<[], { toArchive?: true; fromArchive?: true; dryRun?: true }>,
): Promise<{ isPublished: boolean }> => {
  const { opts, workspace } = context;

  if (!workspace.selected) return { isPublished: false };

  if (opts.fromArchive) {
    return await publishFromArchive(context);
  } else {
    return await publishFromFilesystem(context);
  }
};

const publishFromArchive = async (
  context: WorkspaceContext<[], { dryRun?: true }>,
): Promise<{ isPublished: boolean }> => {
  const { log, opts, workspace, spawn } = context;
  const { dryRun = false } = opts;
  const filename = join(workspace.dir, `${workspace.name.replace(/^@/u, '').replace(/\//gu, '-')}.tgz`);
  const filenameExists = await stat(filename)
    .then((stats) => stats.isFile())
    .catch(() => false);

  if (!filenameExists) {
    log.debug(`Skipping workspace "${workspace.name}@${workspace.version}" because the archive file is missing.`);
    return { isPublished: false };
  }

  await spawn('npm', ['publish', ...(dryRun ? ['--dry-run'] : []), filename], { echo: true, errorThrow: true });

  return { isPublished: true };
};

const publishFromFilesystem = async (
  context: WorkspaceContext<[], { toArchive?: true; dryRun?: true }>,
): Promise<{ isPublished: boolean }> => {
  const { log, opts, workspace, spawn } = context;

  if (await workspace.getNpmIsPublished()) {
    log.debug(`Skipping workspace "${workspace.name}@${workspace.version}" because it is already published.`);
    return { isPublished: false };
  }

  const isGitRepo = await workspace.getGitIsRepo();

  if (isGitRepo) {
    assert(await workspace.getGitIsClean(), `Workspace "${workspace.name}" has uncommitted changes.`);
  }

  // Ensure local production dependencies have been published, and there are no local modifications.
  await Promise.all(
    workspace
      .getLocalDependencies(['dependencies', 'peerDependencies', 'optionalDependencies'])
      .map(async (dependency) => {
        // Dependency published successfully during this command invocation.
        if (await getResult(dependency.name).then((result) => result.isPublished)) return;

        if (isGitRepo) {
          // Dependency was already published and is unmodified.
          if (!(await dependency.getGitIsModified())) return;
        } else {
          // Dependency was already published.
          if (!(await dependency.getNpmIsPublished())) return;
        }

        throw new Error(`Local dependency "${dependency.name}@${dependency.version}" has unpublished modifications.`);
      }),
  );

  const patch: MutablePackageJson = {};

  if (isGitRepo) {
    // Register cleanup of temporary changes to the package.json file.
    workspacesToRestore.push(workspace);

    // Temporarily set "gitHead" in the package.json file. NPM publish
    // should do this automatically. But, it doesn't do it for packing.
    // It's also not documented well even though it is definitely added
    // intentionally in v7.
    patch.gitHead = await workspace.getGitHead();
  }

  // Temporarily update local dependency versions to real versions. File
  // (file:) and wildcard versions should not be published to the
  // registry.
  for (const scope of ['dependencies', 'peerDependencies', 'optionalDependencies'] as const) {
    const dependencies = workspace.getLocalDependencies([scope]);

    for (const dependency of dependencies) {
      // Try to match the existing version range prefix, or default to "^".
      const rangePrefix = workspace[scope][dependency.name]?.match(/^(|~|^|>=?)[a-zA-Z0-9.-]+$/u)?.[1] ?? '^';

      patch[scope] = {
        ...patch[scope],
        [dependency.name]: `${rangePrefix}${dependency.version}`,
      };
    }
  }

  await workspace.patchPackageJson(patch);

  const { toArchive = false, dryRun = false } = opts;

  if (toArchive) {
    await spawn('npm', ['pack', ...(dryRun ? ['--dry-run'] : [])], { echo: true, errorThrow: true });
  } else {
    await spawn('npm', ['publish', ...(dryRun ? ['--dry-run'] : [])], { echo: true, errorThrow: true });
  }

  return { isPublished: true };
};

const getResult = async (name: string): Promise<{ isPublished: boolean }> => {
  const eachPromise = resultPromises.get(name);

  assert(eachPromise, `Workspace order is broken. The "each" hook for "${name}" has not been invoked.`);

  return await eachPromise;
};
