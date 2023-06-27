import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { copyFile, mkdir, rm, stat } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';
import { createGunzip } from 'node:zlib';

import { createCommand, type EachContext, type MutablePackageJson } from '@werk/cli';
import { extract } from 'tar-stream';

const isPublished = new Set<string>();

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
      .option('--no-build', 'Skip building workspaces.')
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

    const isSuccessful = opts.fromArchive ? await publishFromArchive(context) : await publishFromFilesystem(context);

    if (isSuccessful) {
      isPublished.add(workspace.name);
    }
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

  log.notice(`Publishing workspace "${workspace.name}@${workspace.version}" from archive.`);

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

  const [isClean, isModified, isBuilt, isPackComplete] = await Promise.all([
    workspace.getGitIsClean({
      includeDependencyScopes: ['dependencies', 'peerDependencies', 'optionalDependencies'],
      excludeDependencyNames: [...isPublished],
    }),
    workspace.getIsModified({
      includeDependencyScopes: ['dependencies', 'peerDependencies', 'optionalDependencies'],
      excludeDependencyNames: [workspace.name, ...isPublished],
    }),
    workspace.getIsBuilt(),
    (async () => {
      const packJson = await spawn('npm', ['pack', '--dry-run', '--json'], { capture: true }).getJson<
        readonly { readonly files: readonly { readonly path: string }[] }[]
      >();
      const packFiles = (packJson?.[0]?.files ?? []).map(({ path }) => resolve(workspace.dir, path));

      return workspace
        .getEntryPoints()
        .every(({ filename }) => packFiles.some((packFile) => relative(packFile, filename) === ''));
    })(),
  ]);

  assert(isClean, 'Publishing requires a clean Git working tree.');
  assert(!isModified, 'Publishing requires all local dependencies to be unmodified or published.');
  assert(isBuilt, `Workspace "${workspace.name}" is not built. Some package entry points do not exist.`);
  assert(
    isPackComplete,
    `Workspace "${workspace.name}" packed archive is incomplete. Some package entry points do not exist.`,
  );

  log.notice(`Publishing workspace "${workspace.name}@${workspace.version}"${opts.toArchive ? ' to archive' : ''}.`);

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

  await workspace.saveAndRestoreFile('package.json');
  await workspace.patchPackageJson(dependenciesPatch, ...removeFieldPatches, gitHeadPatch);
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
  await new Promise<void>((resolve_, reject) => {
    const extractor = extract()
      .on('entry', (header, stream, next) => {
        if (header.name !== 'package/package.json') {
          stream.resume();
          next();
          return;
        }

        stream.pipe(createWriteStream(join(tmpDir, 'package.json')).on('error', reject)).on('finish', () => {
          extractor.destroy();
          resolve_();
        });
      })
      .on('finish', () => {
        reject(new Error('The archive does not contain a package.json file.'));
      });

    createReadStream(tgz).pipe(createGunzip()).pipe(extractor);
  });
};
