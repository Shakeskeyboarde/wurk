import nodeAssert from 'node:assert';
import nodeFs from 'node:fs/promises';
import nodePath from 'node:path';

import { type Workspace } from 'wurk';

/**
 * Pack the workspace into an archive file.
 */
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
  const tempFilename = nodePath.join(tempDir, getPackBasename(pm, name, version));

  switch (pm) {
    case 'npm':
    case 'pnpm':
      await spawn(pm, [
        'pack',
        ['--pack-destination', tempDir],
      ], { cwd: dir, stdio: quiet ? 'buffer' : 'echo' });
      break;
    case 'yarn':
      await spawn(pm, [
        'pack',
        ['-o', nodePath.join(tempDir, '%s-%v.tgz')],
      ], { cwd: dir, stdio: quiet ? 'buffer' : 'echo' });
      break;
    default:
      throw new Error(`unsupported package manager "${pm}"`);
  }

  // Assert that the expected archive filename exists for fail-fast behavior.
  await nodeFs.access(tempFilename)
    .catch((cause: undefined) => {
      throw new Error(`expected archive file "${tempFilename}" not created`, { cause });
    });

  return tempFilename;
};

/**
 * Get the preferred basename of the package archive file.
 *
 * NOTE: Yarn actually just uses `package.tgz` by default, but it can be
 * configured to use the package name and version in the archive basename
 * with the `%s` and `%v` placeholders.
 */
export const getPackBasename = (pm: string, name: string, version: string): string => {
  name = name.replace(/\//u, '-');

  if (pm === 'npm' || pm === 'pnpm') {
    name = name.replace(/^@/u, '');
  }

  return `${name}-${version}.tgz`;
};
