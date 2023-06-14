import assert from 'node:assert';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';

import { createCommand, type EachContext, type MutablePackageJson } from '@werk/cli';

const isPublished = new Map<string, boolean>();

export default createCommand({
  init: ({ commander, command }) => {
    return commander
      .description(command.packageJson.description ?? '')
      .description('Only unpublished versions of public workspaces are published.')
      .option('--otp <password>', 'One-time password for two-factor authentication.')
      .option('--to-archive', 'Pack each workspace into an archive.')
      .addOption(
        commander.createOption('--from-archive', 'Publish pre-packed workspace archives.').conflicts('toArchive'),
      )
      .option('--dry-run', 'Perform a dry run for validation.');
  },

  before: async ({ forceWait }) => {
    forceWait();
  },

  each: async (context) => {
    const { log, opts, workspace } = context;

    if (workspace.private) {
      log.verbose(`Skipping workspace "${workspace.name}" because it is private.`);
      return;
    }

    if (!workspace.selected) {
      log.verbose(`Skipping workspace "${workspace.name}" because it is not selected.`);
      return;
    }

    const result = opts.fromArchive ? await publishFromArchive(context) : await publishFromFilesystem(context);

    isPublished.set(workspace.name, result);
  },
});

const publishFromArchive = async (context: EachContext<[], { otp?: string; dryRun?: true }>): Promise<boolean> => {
  const { log, opts, workspace, spawn } = context;
  const { otp, dryRun = false } = opts;
  const filename = join(workspace.dir, `${workspace.name.replace(/^@/u, '').replace(/\//gu, '-')}.tgz`);
  const filenameExists = await stat(filename)
    .then((stats) => stats.isFile())
    .catch(() => false);

  if (!filenameExists) {
    log.verbose(`Skipping workspace "${workspace.name}@${workspace.version}" because the archive file is missing.`);
    return false;
  }

  await spawn(
    'npm',
    [`--loglevel=${log.getLevel().name}`, 'publish', Boolean(otp) && `--otp=${otp}`, dryRun && '--dry-run', filename],
    {
      echo: true,
    },
  );

  return true;
};

const publishFromFilesystem = async (
  context: EachContext<[], { otp?: string; toArchive?: true; dryRun?: true }>,
): Promise<boolean> => {
  const { log, opts, workspace, spawn } = context;

  if (await workspace.getNpmIsPublished()) {
    log.verbose(`Skipping workspace "${workspace.name}@${workspace.version}" because it is already published.`);
    return false;
  }

  assert(await workspace.getGitIsClean(), `Workspace "${workspace.name}" has uncommitted changes.`);

  // Ensure local production dependencies have been published, and there are no local modifications.
  await Promise.all(
    workspace
      .getLocalDependencies({ scopes: ['dependencies', 'peerDependencies', 'optionalDependencies'] })
      .map(async (dependency) => {
        // Dependency published successfully during this command invocation.
        if (isPublished.get(dependency.name)) return;

        // Dependency was already published and is unmodified.
        if (!(await dependency.getIsModified())) return;

        throw new Error(`Local dependency "${dependency.name}@${dependency.version}" has unpublished modifications.`);
      }),
  );

  const patch: MutablePackageJson = {
    // Temporarily set "gitHead" in the package.json file. NPM publish
    // should do this automatically. But, it doesn't do it for packing.
    // It's also not documented well even though it is definitely added
    // intentionally in v7.
    gitHead: await workspace.getGitHead(),
  };

  // Temporarily update local dependency versions to real versions. File
  // (file:) and wildcard versions should not be published to the
  // registry.
  for (const scope of ['dependencies', 'peerDependencies', 'optionalDependencies'] as const) {
    const dependencies = workspace.getLocalDependencies({ scopes: [scope] });

    for (const dependency of dependencies) {
      // Try to match the existing version range prefix, or default to "^".
      const rangePrefix = workspace[scope][dependency.name]?.match(/^(|~|^|>=?)[a-zA-Z0-9.-]+$/u)?.[1] ?? '^';

      patch[scope] = {
        ...patch[scope],
        [dependency.name]: `${rangePrefix}${dependency.version}`,
      };
    }
  }

  const { otp, toArchive = false, dryRun = false } = opts;

  if (!dryRun) {
    await workspace.saveAndRestoreFile('package.json');
    await workspace.patchPackageJson(patch);
  }

  await spawn(
    'npm',
    [
      `--loglevel=${log.getLevel().name}`,
      toArchive ? 'pack' : 'publish',
      Boolean(otp) && `--otp=${otp}`,
      dryRun && '--dry-run',
    ],
    {
      echo: true,
    },
  );

  return true;
};
