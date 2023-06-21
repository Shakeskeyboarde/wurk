import { getGitHead } from '../git/get-git-head.js';
import { getGitIsModified } from '../git/get-git-is-modified.js';
import { getGitIsShallow } from '../git/get-git-is-shallow.js';
import { getNpmMetadata } from '../npm/get-npm-metadata.js';

export const getWorkspaceIsModified = async (
  dir: string,
  name: string,
  version: string,
  fromRevision: string | undefined,
  head: string | undefined,
): Promise<boolean> => {
  const [isShallow, from, to] = await Promise.all([
    getGitIsShallow(dir),
    fromRevision ?? getNpmMetadata(name, version).then((meta) => meta?.gitHead),
    head ?? getGitHead(dir),
  ]);

  if (isShallow) throw new Error('Cannot determine if workspace is modified because git repository is shallow.');

  return !!from && !!to && (await getGitIsModified(dir, from, to));
};
