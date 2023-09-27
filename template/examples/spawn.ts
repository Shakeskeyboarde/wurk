import { createCommand } from '@werk/cli';

export default createCommand({
  each: async ({ log, workspace, spawn }) => {
    // Honor the Werk global options for selection.
    if (!workspace.isSelected) return;

    log.info(`Git status for workspace "${workspace.name}".`);

    const status = await spawn('git', ['status', '--porcelain', '--', workspace.dir], {
      echo: true,
      capture: true,
    }).getStdout('utf-8');

    if (status.length !== 0) {
      log.warn(`Workspace "${workspace.name}" has uncommitted changes!`);
    }
  },
});
