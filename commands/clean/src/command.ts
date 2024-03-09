import { createCommand } from 'wurk';

export default createCommand('clean', async ({ createGit, workspaces }) => {
  const git = await createGit();

  await workspaces.forEach(async ({ log, fs }) => {
    const filenames = (await git.getIgnored()).filter((filename) => {
      // Don't clean node_modules and dot-files.
      return !/(?:^|[\\/])(?:node_modules(?:[\\/]|$)|\.)/u.test(filename);
    });

    const promises = filenames.map(async (filename) => {
      log.debug`removing ignored file "${filename}"`;
      await fs.delete(filename, { recursive: true });
    });

    await Promise.all(promises);
  });
});
