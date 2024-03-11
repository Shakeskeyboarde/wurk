import { createCommand, type Workspace } from 'wurk';

import { publishFromArchive } from './publishers/archive.js';
import { publishFromFilesystem } from './publishers/filesystem.js';

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

  action: async ({
    log,
    pm,
    options,
    workspaces,
    createGit,
  }) => {
    if (options.fromArchive) {
      if (options.otp != null) {
        log.warn`option --otp is ignored when --from-archive is set`;
      }

      if (options.removePackageFields != null) {
        log.warn`option --remove-package-fields is ignored when --from-archive is set`;
      }

      if (options.build) {
        log.warn`option --build is ignored when --from-archive is set`;
      }

      await workspaces.forEach(async (workspace) => {
        await publishFromArchive({ options, workspace });
      });
    }
    else {
      if (
        options.build !== false
        && workspaces.root.config
          .at('scripts')
          .at('build')
          .is('string')
      ) {
        await workspaces.root.spawn('npm', ['run', 'build'], {
          output: 'inherit',
        });
      }

      const published = new Set<Workspace>();
      const git = await createGit()
        .catch(() => null);

      await workspaces.forEach(async (workspace) => {
        await publishFromFilesystem({ options, pm, git, workspace, published });
      });
    }
  },
});
