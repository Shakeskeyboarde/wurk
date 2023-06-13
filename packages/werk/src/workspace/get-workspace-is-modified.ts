import { getGitHead } from '../git/get-git-head.js';
import { getGitIsModified } from '../git/get-git-is-modified.js';
import { getNpmMetadata } from '../npm/get-npm-metadata.js';

export const getWorkspaceIsModified = async (
  dir: string,
  name: string,
  version: string,
  fromRevision: string | undefined,
  head: string | undefined,
): Promise<boolean> => {
  if (fromRevision == null) fromRevision = await getNpmMetadata(name, version).then((meta) => meta?.gitHead);
  if (head == null) head = await getGitHead(dir);
  return !!fromRevision && !!head && (await getGitIsModified(dir, fromRevision, head));
};
