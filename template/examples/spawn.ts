import { createCommand } from 'wurk';

export default createCommand('spawn-example', {
  run: async ({ workspaces }) => {
    await workspaces.forEach(async ({ log, name, dir, spawn }) => {
      log.info(`git status for workspace "${name}"`);

      const status = await spawn('git', ['status', '--porcelain', '--', dir]).stdoutText();

      if (status.length !== 0) {
        log.warn(`workspace "${name}" has uncommitted changes`);
      }
    });
  },
});
