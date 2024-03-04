import { createCommand } from 'wurk';

export default createCommand('list', {
  config: (cli) => {
    return cli.alias('ls');
  },

  action: async ({ log, workspaces }) => {
    const data = await Promise.all(
      Array.from(workspaces).map(async (workspace) => {
        const {
          dir,
          relativeDir,
          name,
          version,
          config,
          isPrivate,
          isRoot,
          getDependencyLinks,
          getDependentLinks,
        } = workspace;

        return {
          dir,
          relativeDir,
          name,
          version,
          config,
          dependencyLinks: getDependencyLinks().map((link) => ({
            name: link.dependency.name,
            type: link.type,
            id: link.id,
            spec: link.spec,
          })),
          dependentLinks: getDependentLinks().map((link) => ({
            name: link.dependent.name,
            type: link.type,
            id: link.id,
            spec: link.spec,
          })),
          isPrivate,
          isRoot,
        };
      }),
    );

    log.print(JSON.stringify(data, null, 2));
  },
});
