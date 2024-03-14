import nodeAssert from 'node:assert';
import nodeFs from 'node:fs/promises';
import nodePath from 'node:path';

import { type Workspace } from 'wurk';

export const pack = async (
  options: {
    readonly pm: string;
    readonly workspace: Workspace;
    readonly quiet: boolean;
  },
): Promise<string> => {
  const { pm, workspace, quiet } = options;
  const { name, version, dir, spawn, temp } = workspace;

  nodeAssert(version, 'package.json "version" is required for packing');

  const tempDir = await temp();
  const tempFilename = nodePath.join(tempDir, getPackBasename(name, version));

  switch (pm) {
    case 'npm':
    case 'pnpm':
      await spawn(pm, ['pack', ['--pack-destination', tempDir]], { cwd: dir, stdio: quiet ? 'echo' : 'buffer' });
      // XXX: npm/pnpm only let you specify the directory, not the filename
      // for pack output. So assert that the expected archive file exists for
      // fail-fast behavior.
      await nodeFs.access(tempFilename)
        .catch((cause: undefined) => {
          throw new Error(`expected archive file "${tempFilename}" not created`, { cause });
        });
      break;
    case 'yarn':
      await spawn('yarn', ['pack', ['-o', tempFilename]], { cwd: dir, stdio: quiet ? 'echo' : 'buffer' });
      break;
    case 'yarn-classic':
      await spawn('yarn', ['pack', ['--filename', tempFilename]], { cwd: dir, stdio: quiet ? 'echo' : 'buffer' });
      break;
    default:
      throw new Error(`unsupported package manager "${pm}"`);
  }

  return tempFilename;
};

export const getPackBasename = (name: string, version: string): string => {
  return `${name.replace(/^@/u, '')
    .replace(/\//u, '-')}-${version}.tgz`;
};
