import { createCommand } from 'wurk';

export default createCommand('clean', async ({ workspaces }) => {
  await workspaces.forEach(async ({ log, fs, clean }) => {
    const removed = await clean();
    removed.forEach((file) => log.debug(fs.relative(file)));
  });
});
