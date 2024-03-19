import { createCommand, type Workspace, type WorkspacePublished } from 'wurk';

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
      .option('--remove-package-field <fields...>', {
        description: 'remove fields from the package.json file',
        key: 'removePackageFields',
        parse: (value, previous = []) => {
          const values = value
            .split(/\s*,\s*/u)
            .filter(Boolean);

          return [...values, ...previous];
        },
      })
      .optionConflict('removePackageFields', 'fromArchive')
      .option('--dry-run', 'perform a dry-run for validation');
  },

  action: async ({ log, options, workspaces, pm, createGit }) => {
    if (options.fromArchive) {
      if (options.otp != null) {
        log.warn`option --otp is ignored when --from-archive is set`;
      }

      if (options.removePackageFields != null) {
        log.warn`option --remove-package-fields is ignored when --from-archive is set`;
      }

      await workspaces.forEach(publishFromArchive.bind(null, { options, pm }));
    }
    else {
      const published = new Map<Workspace, WorkspacePublished>();
      const git = await createGit()
        .catch(() => null);

      await workspaces.forEach(publishFromFilesystem.bind(null, { options, pm, git, published }));
    }
  },
});
