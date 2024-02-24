import { createCommand } from 'wurk';

import { publishFromArchive } from './archive.js';
import { publishFromFilesystem } from './filesystem.js';

export default createCommand('publish', {
  config: (cli) => {
    return cli
      .trailer('Only unpublished versions of public workspaces are published.')
      .option('--to-archive', 'pack each workspace into an archive')
      .option('--from-archive', 'publish pre-packed workspace archives')
      .optionConflict('toArchive', 'fromArchive')
      .option('--tag <tag>', 'publish with a dist-tag')
      .option(
        '--otp <password>',
        'one-time password for two-factor authentication',
      )
      .option(
        '--remove-package-fields <fields...>',
        'remove fields from the package.json file',
      )
      .optionConflict('removePackageFields', 'fromArchive')
      .option('--build', { hidden: true })
      .option('--no-build', 'skip building workspaces')
      .optionNegation('build', 'noBuild')
      .option('--dry-run', 'perform a dry-run for validation');
  },

  action: async ({ log: rootLog, options, workspaces, autoPrintStatus }) => {
    autoPrintStatus();

    if (
      !options.fromArchive &&
      options.build &&
      workspaces.root.config.at('scripts').at('build').is('string')
    ) {
      rootLog.info(`running pre-publish build`);

      await workspaces.root.spawn('npm', ['run', 'build'], {
        output: 'inherit',
      });
    }

    await workspaces.forEach(async (workspace) => {
      const { log, config, status } = workspace;

      if (config.at('private').as('boolean', false)) {
        log.verbose(`skipping private workspace`);
        status.set('skipped', 'private');
        return;
      }

      return options.fromArchive
        ? await publishFromArchive({ options, workspace })
        : await publishFromFilesystem({ options, workspace });
    });
  },
});
