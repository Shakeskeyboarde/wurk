import { createCommand } from 'wurk';

export default createCommand('clean', async ({ workspaces }) => {
  await workspaces.forEach(async ({ clean }) => {
    await clean();
  });
});
