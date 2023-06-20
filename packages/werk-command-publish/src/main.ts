import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { copyFile, mkdir, rm, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { createGunzip } from 'node:zlib';

import { createCommand, type EachContext, type MutablePackageJson } from '@werk/cli';
import { extract } from 'tar-stream';

const isPublished = new Map<string, boolean>();

export default createCommand({
  init: ({ commander, command }) => {
    return commander
      .description(command.packageJson.description ?? '')
      .description('Only unpublished versions of public workspaces are published.')
      .option('--to-archive', 'Pack each workspace into an archive.')
      .addOption(
        commander.createOption('--from-archive', 'Publish pre-packed workspace archives.').conflicts('toArchive'),
      )
      .option('--tag <tag>', 'Publish with a dist-tag.')
      .option('--otp <password>', 'One-time password for two-factor authentication.')
      .addOption(
        commander
          .createOption('--remove-package-fields <fields...>', 'Remove fields from the package.json file.')
          .conflicts('fromArchive'),
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

    log.notice(`Publishing workspace "${workspace.name}@${workspace.version}".`);

    const result = opts.fromArchive ? await publishFromArchive(context) : await publishFromFilesystem(context);

    isPublished.set(workspace.name, result);
  },
});

const publishFromArchive = async (
  context: EachContext<[], { readonly otp?: string; readonly tag?: string; readonly dryRun?: true }, unknown>,
): Promise<boolean> => {
  const { log, opts, workspace, spawn } = context;
  const { tag, otp, dryRun = false } = opts;
  const filename = join(
    workspace.dir,
    `${workspace.name.replace(/^@/u, '').replace(/\//gu, '-')}-${workspace.version}.tgz`,
  );
  const filenameExists = await stat(filename)
    .then((stats) => stats.isFile())
    .catch(() => false);

  if (!filenameExists) {
    log.verbose(
      `Skipping workspace "${workspace.name}@${workspace.version}" because the archive file "${filename}" is missing.`,
    );
    return false;
  }

  const tmpDir = join(workspace.dir, `.${randomUUID()}.tmp`);
  const tmpFilename = join(tmpDir, basename(filename));

  try {
    await mkdir(tmpDir, { recursive: true });
    await copyFile(filename, tmpFilename);
    await extractPackageJson(filename, tmpDir);

    await spawn(
      'npm',
      [
        `--loglevel=${log.level.name}`,
        'publish',
        Boolean(tag) && `--tag=${tag}`,
        Boolean(otp) && `--otp=${otp}`,
        dryRun && '--dry-run',
        tmpFilename,
      ],
      { cwd: tmpDir, echo: true },
    );
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }

  return true;
};

const publishFromFilesystem = async (
  context: EachContext<
    [],
    {
      readonly toArchive?: true;
      readonly tag?: string;
      readonly otp?: string;
      readonly removePackageFields?: readonly string[];
      readonly dryRun?: true;
    },
    unknown
  >,
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

  const { toArchive = false, tag, otp, removePackageFields = [], dryRun = false } = opts;
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

  if (!dryRun) {
    await workspace.saveAndRestoreFile('package.json');
    await workspace.patchPackageJson(dependenciesPatch, ...removeFieldPatches, gitHeadPatch);
  }

  await spawn('npm', [`--loglevel=${log.level.name}`, 'run', '--if-present', 'build'], { echo: true });

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

  return true;
};

export const extractPackageJson = async (tgz: string, tmpDir: string): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const extractor = extract()
      .on('entry', (header, stream, next) => {
        if (header.name !== 'package/package.json') {
          stream.resume();
          next();
          return;
        }

        stream.pipe(createWriteStream(join(tmpDir, 'package.json')).on('error', reject)).on('finish', () => {
          extractor.destroy();
          resolve();
        });
      })
      .on('finish', () => {
        reject(new Error('The archive does not contain a package.json file.'));
      });

    createReadStream(tgz).pipe(createGunzip()).pipe(extractor);
  });
};
