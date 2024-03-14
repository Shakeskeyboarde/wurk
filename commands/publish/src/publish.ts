import nodeFs from 'node:fs/promises';
import nodePath from 'node:path';

import { type PackageManagerInfo, type Workspace } from 'wurk';

import { readTar } from './tar.js';

export const publish = async (
  options: {
    readonly pm: PackageManagerInfo;
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
  const tmpArchiveFilename = nodePath.resolve(tmpDir, 'package.tgz');

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
    'package.tgz',
    Boolean(tag) && `--tag=${tag}`,
    Boolean(otp) && `--otp=${otp}`,
    dryRun && '--dry-run',
  ];

  switch (pm.id) {
    case 'npm':
    case 'pnpm':
    case 'yarn-classic':
      return void await spawn(pm.command, commonArgs, { cwd: tmpDir, stdio: 'echo' });
    case 'yarn':
      return void await spawn(pm.command, ['npm', commonArgs], { cwd: tmpDir, stdio: 'echo' });
    default:
      throw new Error(`unsupported package manager "${pm.id}"`);
  }
};
