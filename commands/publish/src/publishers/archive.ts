import nodeAssert from 'node:assert';
import nodeFs from 'node:fs/promises';
import nodePath from 'node:path';
import nodeZlib from 'node:zlib';

import { extract } from 'tar-stream';
import { type Workspace } from 'wurk';

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
  const { log, dir, name, version, status, spawn } = workspace;

  status.set('pending');

  if (!version) {
    log.info`workspace is unversioned`;
    status.set('skipped', 'unversioned');
    return;
  }

  const basename = name
    .replace(/^@/u, '')
    .replace(/\//gu, '-');
  const filename = nodePath.resolve(dir, `${basename}-${version}.tgz`);
  const exists = await nodeFs.access(filename)
    .then(() => true, () => false);

  if (!exists) {
    log.info`workspace has no archive`;
    status.set('skipped', 'no archive');
    return;
  }

  log.info`publishing version ${version} from archive to registry`;

  /**
   * This is a subdirectory of the workspace directory so that .npmrc files
   * in parent directories are still in effect.
   */
  const tmpDir = await nodeFs.mkdtemp(nodePath.resolve(dir, '.wurk-publish-archive-'));
  const tmpFilename = nodePath.resolve(tmpDir, nodePath.basename(filename));

  await nodeFs.copyFile(filename, tmpFilename);
  await extractPackageJson(tmpFilename, tmpDir);
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
  tgz: string,
  tmpDir: string,
): Promise<void> => {
  const handle = await nodeFs.open(tgz, 'r');
  const readable = handle.createReadStream();

  nodeAssert(readable, 'failed to read workspace archive');

  try {
    const extractor = readable
      .pipe(nodeZlib.createGunzip())
      .pipe(extract());

    for await (const entry of extractor) {
      if (entry.header.name === 'package/package.json') {
        await nodeFs.writeFile(nodePath.resolve(tmpDir, 'package.json'), entry);
      }
      else {
        // Skip the entry to allow the next entry to be read.
        entry.resume();
      }
    }
  }
  finally {
    readable.destroy();
    await handle.close();
  }
};
