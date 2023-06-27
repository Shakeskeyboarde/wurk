import { createCommand } from '@werk/cli';

import { publishFromArchive } from './publish-from-archive.js';
import { publishFromFilesystem } from './publish-from-filesystem.js';

export default createCommand({
  init: ({ commander, command }) => {
    return commander
      .description(command.packageJson.description ?? '')
      .description('Only unpublished versions of public workspaces are published.')
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
      .option('--no-changelog-check', 'Skip checking for CHANGELOG.md update in last commit.')
      .option('--dry-run', 'Perform a dry run for validation.');
  },

  before: async ({ log, opts, root, spawn, forceWait }) => {
    forceWait();

    if (!opts.fromArchive && opts.build && root.scripts.build != null) {
      log.notice('Building workspaces.');

      const succeeded = await spawn('npm', [`--loglevel=${log.level.name}`, 'run', '--if-present', 'build'], {
        echo: 'inherit',
        errorSetExitCode: true,
      }).succeeded();

      if (!succeeded) return;
    }

    log.notice('Publishing workspaces.');
  },

  each: async (context) => {
    const { log, opts, workspace } = context;

    if (workspace.private) {
      log.verbose(`Not publishing workspace "${workspace.name}" because it is private.`);
      return;
    }

    if (!workspace.selected) {
      log.verbose(`Not publishing workspace "${workspace.name}" because it is not selected.`);
      return;
    }

    if (opts.fromArchive) {
      await publishFromArchive(context);
    } else {
      await publishFromFilesystem(context);
    }
  },
});
