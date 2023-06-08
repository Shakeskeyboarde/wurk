import { getGitIsModified } from '../git/get-git-is-modified.js';

/**
 * A workspace is considered modified if...
 *
 * - No previous commit is available (ie. a published `gitHead` package metadata).
 * - Changes exist when diffed against the commit.
 */
export const getWorkspaceIsModified = async (dir: string, commit: string | undefined): Promise<boolean> => {
  // No gitHead means the package is either not published, or the
  // "gitHead" was not recorded when it was published. Either way,
  // assume the workspaces is modified.
  if (commit == null) return true;

  return await getGitIsModified(dir, commit);
};
