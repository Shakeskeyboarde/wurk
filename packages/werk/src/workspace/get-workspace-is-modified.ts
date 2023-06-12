import { getGitIsModified } from '../git/get-git-is-modified.js';

/**
 * A workspace is considered modified if...
 *
 * - The workspace version is not published.
 * - No published commit is available.
 * - Changes exist when diffed against the published commit.
 */
export const getWorkspaceIsModified = async (dir: string, commit: string | undefined): Promise<boolean> => {
  // No commit means the package is either not published, or the commit
  // was not recorded when it was published. Either way, assume the
  // workspaces is modified.
  if (commit == null) return true;

  return await getGitIsModified(dir, commit);
};
