import { type Workspace } from './workspace.js';

export const clean = async (workspace: Workspace): Promise<void> => {
  const git = await workspace.getGit().catch(() => null);

  if (!git) return;

  const filenames = (await git.getIgnored())
    // Don't clean node_modules and dot-files.
    .filter((filename) => {
      return !/(?:^|[\\/])node_modules(?:[\\/]|$)/u.test(filename);
    })
    .filter((filename) => {
      return !/(?:^|[\\/])\./u.test(filename);
    });

  const promises = filenames.map(async (filename) => {
    workspace.log.debug(`removing ignored file "${filename}"`);
    await workspace.fs.delete(filename, { recursive: true });
  });

  await Promise.all(promises);
};
