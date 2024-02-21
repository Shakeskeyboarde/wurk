import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { copyFile, mkdir, rm, stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { createGunzip } from 'node:zlib';

import { extract } from 'tar-stream';
import { type Workspace } from 'wurk';

interface PublishFromArchiveContext {
  readonly options: {
    readonly tag?: string;
    readonly otp?: string;
    readonly dryRun?: boolean;
  };
  readonly workspace: Workspace;
}

export const publishFromArchive = async ({ options, workspace }: PublishFromArchiveContext): Promise<void> => {
  const { tag, otp, dryRun = false } = options;
  const { log, dir, name, version, status, spawn } = workspace;

  status.set('pending');

  if (!version) {
    log.verbose(`skipping workspace without a version`);
    status.set('skipped', 'no version');
    return;
  }

  const filename = resolve(dir, `${name.replace(/^@/u, '').replace(/\//gu, '-')}-${version}.tgz`);
  const filenameExists = await stat(filename)
    .then((stats) => stats.isFile())
    .catch(() => false);

  if (!filenameExists) {
    log.verbose(`no workspace archive found`);
    status.set('skipped', 'no archive');
    return;
  }

  log.info(`publishing v${version} from archive to registry`);

  const tmpDir = resolve(dir, `.${randomUUID()}.tmp`);
  const tmpFilename = resolve(tmpDir, basename(filename));

  try {
    await mkdir(tmpDir, { recursive: true });
    await copyFile(filename, tmpFilename);
    await extractPackageJson(filename, tmpDir);

    await spawn(
      'npm',
      ['publish', Boolean(tag) && `--tag=${tag}`, Boolean(otp) && `--otp=${otp}`, dryRun && '--dry-run', tmpFilename],
      { cwd: tmpDir, output: 'echo' },
    );
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }

  status.set('success', version);
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
        reject(new Error('archive does not contain a package.json file'));
      });

    createReadStream(tgz).pipe(createGunzip()).pipe(extractor);
  });
};
