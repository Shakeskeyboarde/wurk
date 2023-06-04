/**
 * Return true if there are no changes in the directory when checking the
 * git status of the current HEAD revision.
 */
export const getIsGitStatusEmpty = async (dir: string): Promise<boolean> => {
  return await spawn('git', ['status', '--porcelain', '--', '.'], { capture: true, cwd: dir })
    .stdout()
    .then((value) => value.length <= 0)
    .catch(() => false);
};

/**
 * Hard reset the current Git working tree to the HEAD revision.
 */
export const resetGitHard = async (dir: string): Promise<void> => {
  await spawn('git', ['reset', '--hard'], { cwd: dir, throw: false });
};
