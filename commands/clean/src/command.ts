import nodeFs from 'node:fs/promises';

import { createCommand } from 'wurk';

export default createCommand('clean', async ({ createGit, workspaces }) => {
  const git = await createGit();

  await workspaces.forEach(async ({ log, dir }) => {
    const filenames = (await git.getIgnored(dir)).filter((filename) => {
      // Don't clean node_modules and dot-files.
      return !/(?:^|[\\/])(?:node_modules(?:[\\/]|$)|\.)/u.test(filename);
    });

    const promises = filenames.map(async (filename) => {
      log.debug`removing ignored file "${filename}"`;
      await nodeFs.rm(filename, { recursive: true, force: true });
    });

    await Promise.all(promises);
  });
});
