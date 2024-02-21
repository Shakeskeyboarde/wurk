import { createCommand } from 'wurk';

export default createCommand('clean', {
  run: async ({ workspaces }) => {
    await workspaces.forEach(async ({ log, clean }) => {
      log.info(`cleaning workspace`);

      const removed = await clean();

      if (removed.length === 0) {
        log.info('nothing to remove');
      } else {
        log.info(`removed the following files:`);
        removed.forEach((file) => log.info(`  - ${file}`));
      }
    });
  },
});
