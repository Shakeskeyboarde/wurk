import assert from 'node:assert';
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

export const publishFromArchive = async (
  context: PublishFromArchiveContext,
): Promise<void> => {
  const { options, workspace } = context;
  const { log, name, version, status, fs, spawn } = workspace;

  status.set('pending');

  if (!version) {
    log.verbose(`skipping workspace without a version`);
    status.set('skipped', 'no version');
    return;
  }

  const filename = fs.resolve(
    `${name.replace(/^@/u, '').replace(/\//gu, '-')}-${version}.tgz`,
  );

  if (!(await fs.exists(filename))) {
    log.verbose(`no workspace archive found`);
    status.set('skipped', 'no archive');
    return;
  }

  log.info(`publishing version ${version} from archive to registry`);

  /**
   * This is a subdirectory of the workspace directory so that .npmrc files
   * in parent directories are still in effect.
   */
  const tmpDir = fs.resolve(`.${crypto.randomUUID()}.tmp`);
  const tmpFilename = fs.resolve(tmpDir, path.basename(filename));

  let stderrText: string;

  try {
    await fs.copyFile(filename, tmpFilename);
    await extractPackageJson(fs, tmpFilename, tmpDir);

    ({ stderrText } = await spawn(
      'npm',
      [
        'publish',
        '--json',
        Boolean(options.tag) && `--tag=${options.tag}`,
        Boolean(options.otp) && `--otp=${options.otp}`,
        options.dryRun && '--dry-run',
        tmpFilename,
      ],
      { cwd: tmpDir },
    ));
  } finally {
    await fs.delete(tmpDir, { recursive: true });
  }

  if (stderrText) {
    log.print(stderrText, { to: 'stderr' });
  }

  status.set('success', version);
};

const extractPackageJson = async (
  fs: Fs,
  tgz: string,
  tmpDir: string,
): Promise<void> => {
  const readable = await fs.readStream(tgz);

  assert(readable, 'failed to open archive');

  try {
    const extractor = readable.pipe(zlib.createGunzip()).pipe(extract());

    for await (const entry of extractor) {
      if (entry.header.name === 'package/package.json') {
        await fs.write(fs.resolve(tmpDir, 'package.json'), entry);
        return;
      }

      entry.resume();
    }
  } finally {
    readable.close();
  }
};
