import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { copyFile, mkdir, rm, stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { createGunzip } from 'node:zlib';

import { type Log, type Spawn, type Workspace } from '@werk/cli';
import { extract } from 'tar-stream';

interface PublishFromArchiveOptions {
  readonly log: Log;
  readonly opts: {
    readonly tag?: string;
    readonly otp?: string;
    readonly dryRun?: true;
  };
  readonly workspace: Workspace;
  readonly spawn: Spawn;
}

export const publishFromArchive = async (options: PublishFromArchiveOptions): Promise<boolean> => {
  const { log, opts, workspace, spawn } = options;
  const { tag, otp, dryRun = false } = opts;
  const filename = resolve(
    workspace.dir,
    `${workspace.name.replace(/^@/u, '').replace(/\//gu, '-')}-${workspace.version}.tgz`,
  );
  const filenameExists = await stat(filename)
    .then((stats) => stats.isFile())
    .catch(() => false);

  if (!filenameExists) {
    log.verbose(
      `Not publishing workspace "${workspace.name}@${workspace.version}" because the archive file "${filename}" is missing.`,
    );

    return false;
  }

  log.notice(`Publishing workspace "${workspace.name}@${workspace.version}" from archive.`);

  const tmpDir = resolve(workspace.dir, `.${randomUUID()}.tmp`);
  const tmpFilename = resolve(tmpDir, basename(filename));

  try {
    await mkdir(tmpDir, { recursive: true });
    await copyFile(filename, tmpFilename);
    await extractPackageJson(filename, tmpDir);

    await spawn(
      'npm',
      ['publish', Boolean(tag) && `--tag=${tag}`, Boolean(otp) && `--otp=${otp}`, dryRun && '--dry-run', tmpFilename],
      { cwd: tmpDir, echo: true },
    );
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }

  return true;
};

const extractPackageJson = async (tgz: string, tmpDir: string): Promise<void> => {
  await new Promise<void>((resolve_, reject) => {
    const extractor = extract()
      .on('entry', (header, stream, next) => {
        if (header.name !== 'package/package.json') {
          stream.resume();
          next();
          return;
        }

        stream.pipe(createWriteStream(resolve(tmpDir, 'package.json')).on('error', reject)).on('finish', () => {
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
