import nodeFs from 'node:fs/promises';
import nodePath from 'node:path';

import { type Workspace } from 'wurk';

import { readTar } from './tar.js';

/**
 * Publish an archive to the NPM registry. An archive is always used as an
 * intermediate step to ensure that the required files are included in the
 * published package.
 */
export const publish = async (
  options: {
    readonly pm: string;
    readonly workspace: Workspace;
    readonly archiveFilename: string;
    readonly tag: string | undefined;
    readonly otp: string | undefined;
    readonly dryRun: boolean | undefined;
  },
): Promise<void> => {
  const { pm, workspace, archiveFilename, tag, otp, dryRun } = options;
  const { spawn, temp } = workspace;
  const tmpDir = await temp('wurk-publish-', { local: true });
  const tmpArchiveBasename = nodePath.basename(archiveFilename);
  const tmpArchiveFilename = nodePath.resolve(tmpDir, tmpArchiveBasename);

  await nodeFs.rename(archiveFilename, tmpArchiveFilename);
  await readTar(tmpArchiveFilename, async (entry, abort) => {
    if (entry.header.name === 'package.json') {
      // Extract the package.json file from the archive so that the publish
      // command references it instead of the real package.json file in the
      // parent (workspace) directory.
      await nodeFs.writeFile(nodePath.join(tmpDir, 'package.json'), entry);
      abort();
    }
  });

  const commonArgs = [
    'publish',
    tmpArchiveBasename,
    Boolean(tag) && `--tag=${tag}`,
    Boolean(otp) && `--otp=${otp}`,
    dryRun && '--dry-run',
  ];

  switch (pm) {
    case 'npm':
      return void await spawn(pm, [commonArgs, '--workspaces=false'], { cwd: tmpDir, stdio: 'echo' });
    case 'pnpm':
      return void await spawn(pm, commonArgs, { cwd: tmpDir, stdio: 'echo' });
    case 'yarn':
      return void await spawn(pm, ['npm', commonArgs], { cwd: tmpDir, stdio: 'echo' });
    default:
      throw new Error(`unsupported package manager "${pm}"`);
  }
};
