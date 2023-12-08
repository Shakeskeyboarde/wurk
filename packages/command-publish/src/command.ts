import { createCommand } from '@werk/cli';

import { publishFromArchive } from './publish-from-archive.js';
import { publishFromFilesystem } from './publish-from-filesystem.js';

export default createCommand({
  config: (commander) => {
    return commander
      .addHelpText('after', 'Only unpublished versions of public workspaces are published.')
      .option('--to-archive', 'Pack each workspace into an archive.')
      .addOption(
        commander.createOption('--from-archive', 'Publish pre-packed workspace archives.').conflicts('toArchive'),
      )
      .option('--tag <tag>', 'Publish with a dist-tag.')
      .option('--otp <password>', 'One-time password for two-factor authentication.')
      .addOption(
        commander
          .createOption('--remove-package-fields <fields...>', 'Remove fields from the package.json file.')
          .conflicts('fromArchive'),
      )
      .option('--no-build', 'Skip building workspaces.')
      .option('--dry-run', 'Perform a dry run for validation.');
  },

  before: async ({ log, opts, root, spawn, setPrintSummary }) => {
    setPrintSummary();

    if (!opts.fromArchive && opts.build && root.scripts.build != null) {
      log.info(`Running pre-publish build.`);

      await spawn('npm', ['run', 'build'], {
        input: 'inherit',
        echo: 'inherit',
        errorReturn: true,
        errorSetExitCode: true,
      });
    }
  },

  each: async (context) => {
    const { log, opts, workspace } = context;

    if (!workspace.isSelected) {
      log.verbose(`Skipping unselected workspace.`);
      return;
    }

    if (workspace.isPrivate) {
      log.verbose(`Skipping private workspace.`);
      workspace.setStatus('skipped', 'private');
      return;
    }

    workspace.setStatus('pending');

    return opts.fromArchive ? await publishFromArchive(context) : await publishFromFilesystem(context);
  },
});
