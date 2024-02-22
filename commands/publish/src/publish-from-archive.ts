import crypto from 'node:crypto';
import path from 'node:path';
import zlib from 'node:zlib';

import { extract } from 'tar-stream';
import { type Fs, type Workspace } from 'wurk';

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
  const { log, name, version, status, fs, spawn } = workspace;

  status.set('pending');

  if (!version) {
    log.verbose(`skipping workspace without a version`);
    status.set('skipped', 'no version');
    return;
  }

  const filename = fs.resolve(`${name.replace(/^@/u, '').replace(/\//gu, '-')}-${version}.tgz`);
  const filenameExists = await fs
    .stat(filename)
    .then((stats) => stats.isFile())
    .catch(() => false);

  if (!filenameExists) {
    log.verbose(`no workspace archive found`);
    status.set('skipped', 'no archive');
    return;
  }

  log.info(`publishing version ${version} from archive to registry`);

  const tmpDir = fs.resolve(`.${crypto.randomUUID()}.tmp`);
  const tmpFilename = fs.resolve(tmpDir, path.basename(filename));

  try {
    await fs.copyFile(filename, tmpFilename);
    await extractPackageJson(fs, tmpFilename, tmpDir);

    await spawn(
      'npm',
      ['publish', Boolean(tag) && `--tag=${tag}`, Boolean(otp) && `--otp=${otp}`, dryRun && '--dry-run', tmpFilename],
      { cwd: tmpDir, output: 'echo' },
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }

  status.set('success', version);
};

const extractPackageJson = async (fs: Fs, tgz: string, tmpDir: string): Promise<void> => {
  const readable = await fs.createReadStream(tgz);
  const extractor = readable.pipe(zlib.createGunzip()).pipe(extract());

  for await (const entry of extractor) {
    if (entry.header.name === 'package/package.json') {
      await fs.write(fs.resolve(tmpDir, 'package.json'), entry);
      return;
    }

    entry.resume();
  }

  readable.close();
};
