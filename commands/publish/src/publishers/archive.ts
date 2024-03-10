import nodeAssert from 'node:assert';
import nodePath from 'node:path';
import nodeZlib from 'node:zlib';

import { extract } from 'tar-stream';
import { type Fs, type Workspace } from 'wurk';

interface Context {
  readonly options: {
    readonly tag?: string;
    readonly otp?: string;
    readonly dryRun?: boolean;
  };
  readonly workspace: Workspace;
}

export const publishFromArchive = async (context: Context): Promise<void> => {
  const { options, workspace } = context;
  const { log, dir, name, version, status, fs, spawn } = workspace;

  status.set('pending');

  if (!version) {
    log.info`workspace is unversioned`;
    status.set('skipped', 'unversioned');
    return;
  }

  const basename = name
    .replace(/^@/u, '')
    .replace(/\//gu, '-');
  const filename = fs.resolve(`${basename}-${version}.tgz`);

  if (!(await fs.exists(filename))) {
    log.info`workspace has no archive`;
    status.set('skipped', 'no archive');
    return;
  }

  log.info`publishing version ${version} from archive to registry`;

  /**
   * This is a subdirectory of the workspace directory so that .npmrc files
   * in parent directories are still in effect.
   */
  const tmpDir = await fs.temp(dir, 'publish-archive');
  const tmpFilename = fs.resolve(tmpDir, nodePath.basename(filename));

  await fs.copyFile(filename, tmpFilename);
  await extractPackageJson(fs, tmpFilename, tmpDir);
  await spawn(
    'npm',
    [
      'publish',
      Boolean(options.tag) && `--tag=${options.tag}`,
      Boolean(options.otp) && `--otp=${options.otp}`,
      options.dryRun && '--dry-run',
      tmpFilename,
    ],
    { cwd: tmpDir, output: 'echo' },
  );

  status.set('success', `publish archive ${version}`);
};

const extractPackageJson = async (
  fs: Fs,
  tgz: string,
  tmpDir: string,
): Promise<void> => {
  const readable = await fs.readStream(tgz);

  nodeAssert(readable, 'failed to read workspace archive');

  try {
    const extractor = readable
      .pipe(nodeZlib.createGunzip())
      .pipe(extract());

    for await (const entry of extractor) {
      if (entry.header.name === 'package/package.json') {
        await fs.write(fs.resolve(tmpDir, 'package.json'), entry);
        return;
      }

      entry.resume();
    }
  }
  finally {
    readable.close();
  }
};
