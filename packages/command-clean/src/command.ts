import { createCommand } from '@werk/cli';

export default createCommand({
  each: async ({ log, workspace }) => {
    if (!workspace.isSelected) return;

    log.info(`Cleaning workspace.`);

    const removed = await workspace.clean();

    if (removed.length === 0) {
      log.info('Nothing to remove.');
    } else {
      log.info(`Removed the following files:`);
      removed.forEach((file) => log.info(`  - ${file}`));
    }
  },
});
