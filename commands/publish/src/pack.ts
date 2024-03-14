import nodeAssert from 'node:assert';
import nodeFs from 'node:fs/promises';
import nodePath from 'node:path';

import { type PackageManagerInfo, type Workspace } from 'wurk';

export const pack = async (
  options: {
    readonly pm: PackageManagerInfo;
    readonly workspace: Workspace;
    readonly quiet: boolean;
  },
): Promise<string> => {
  const { pm, workspace, quiet } = options;
  const { name, version, dir, spawn, temp } = workspace;

  nodeAssert(version, 'package.json "version" is required for packing');

  const tempDir = await temp();
  const tempFilename = nodePath.join(tempDir, getPackBasename(name, version));

  switch (pm.id) {
    case 'npm':
    case 'pnpm':
      await spawn(pm.command, ['pack', ['--pack-destination', tempDir]], { cwd: dir, stdio: quiet ? 'echo' : 'buffer' });
      // XXX: npm/pnpm only let you specify the directory, not the filename
      // for pack output. So assert that the expected archive file exists for
      // fail-fast behavior.
      await nodeFs.access(tempFilename)
        .catch((cause: undefined) => {
          throw new Error(`expected archive file "${tempFilename}" not created`, { cause });
        });
      break;
    case 'yarn':
      await spawn(pm.command, ['pack', ['-o', tempFilename]], { cwd: dir, stdio: quiet ? 'echo' : 'buffer' });
      break;
    case 'yarn-classic':
      await spawn(pm.command, ['pack', ['--filename', tempFilename]], { cwd: dir, stdio: quiet ? 'echo' : 'buffer' });
      break;
    default:
      throw new Error(`unsupported package manager "${pm.id}"`);
  }

  return tempFilename;
};

export const getPackBasename = (name: string, version: string): string => {
  return `${name.replace(/^@/u, '')
    .replace(/\//u, '-')}-${version}.tgz`;
};
