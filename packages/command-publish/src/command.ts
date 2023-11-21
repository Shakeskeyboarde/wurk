import { createCommand } from '@werk/cli';

import { publishFromArchive } from './publish-from-archive.js';
import { publishFromFilesystem } from './publish-from-filesystem.js';

let isPublished = false;

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

  before: async ({ opts, root, spawn }) => {
    if (!opts.fromArchive && opts.build && root.scripts.build != null) {
      await spawn('npm', ['run', '--if-present', 'build'], {
        echo: 'inherit',
        errorReturn: true,
        errorSetExitCode: true,
      });
    }
  },

  each: async (context) => {
    const { log, opts, workspace } = context;

    if (workspace.isPrivate) {
      log.verbose(`Not publishing workspace "${workspace.name}" because it is private.`);
      return;
    }

    if (!workspace.isSelected) {
      log.verbose(`Not publishing workspace "${workspace.name}" because it is not selected.`);
      return;
    }

    if (opts.fromArchive) {
      isPublished = (await publishFromArchive(context)) || isPublished;
    } else {
      isPublished = (await publishFromFilesystem(context)) || isPublished;
    }
  },

  after: async ({ log }) => {
    if (!isPublished) {
      log.info('No publishable packages found.');
    }
  },
});
