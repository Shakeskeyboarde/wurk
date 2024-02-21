import { createCommand } from 'wurk';

export default createCommand('list', {
  config: (cli) => {
    return cli.alias('ls');
  },

  run: async ({ log, workspaces }) => {
    const data = await Promise.all(
      Array.from(workspaces).map(
        async ({ version, config, dir, git, npm, isRoot, getIsModified, getDependencyLinks, getDependentLinks }) => {
          const isRepo = await git.getIsRepo();
          const [meta, isDirty, gitHead, isModified] = await Promise.all([
            npm.getMetadata(),
            isRepo ? git.getIsDirty() : undefined,
            isRepo ? git.getHead() : undefined,
            isRepo ? getIsModified() : undefined,
          ]);

          return {
            dir,
            config,
            dependencyLinks: getDependencyLinks().map((link) => ({
              name: link.dependency.name,
              dir: link.dependency.dir,
              scope: link.scope,
              id: link.id,
              versionRange: link.versionRange,
            })),
            dependentLinks: getDependentLinks().map((link) => ({
              name: link.dependent.name,
              dir: link.dependent.dir,
              scope: link.scope,
              id: link.id,
              versionRange: link.versionRange,
            })),
            npm: {
              version: meta ? meta.version : null,
              gitHead: meta?.gitHead ?? null,
              isPublished: Boolean(meta && meta.version === version),
            },
            git: {
              head: gitHead ?? null,
              isRepo,
              isDirty: isDirty ?? null,
            },
            isModified,
            isRoot,
          };
        },
      ),
    );

    log.print(JSON.stringify(data, null, 2));
  },
});
