import { createCommand } from 'wurk';

export default createCommand('spawn-example', {
  run: async ({ workspaces }) => {
    await workspaces.forEach(async ({ log, dir, spawn }) => {
      const status = await spawn('git', ['status', '--porcelain', '--', dir]).stdoutText();

      if (status.length !== 0) {
        log.warn(`workspace has dirty working tree`);
      }
    });
  },
});
