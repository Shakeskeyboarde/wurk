import { createCommand, WorkspaceDependencyScope } from '@werk/cli';

export default createCommand({
  config: (commander) => {
    return commander
      .alias('ls')
      .addOption(
        commander.createOption('-a, --all', 'Include all NPM and Git information').implies({
          npmIsPublished: true,
          npmHead: true,
          gitIsRepo: true,
          gitIsDirty: true,
          gitHead: true,
          gitIsModified: true,
        }),
      )
      .addOption(
        commander
          .createOption('--all-npm', 'Include all NPM information')
          .implies({ npmIsPublished: true, npmHead: true }),
      )
      .addOption(
        commander
          .createOption('--all-git', 'Include all Git information')
          .implies({ gitIsRepo: true, gitIsDirty: true, gitHead: true }),
      )
      .option('-p, --npm-is-published', 'Is the package version published to NPM?')
      .addOption(commander.createOption('--no-npm-is-published').hideHelp())
      .option('-n, --npm-head', 'The commit published to NPM.')
      .addOption(commander.createOption('--no-npm-head').hideHelp())
      .option('-r, --git-is-repo', 'Is the package a Git repository?')
      .addOption(commander.createOption('--no-git-is-repo').hideHelp())
      .option('-d, --git-is-dirty', 'Is the Git working tree dirty?')
      .addOption(commander.createOption('--no-git-is-dirty').hideHelp())
      .option('-g, --git-head', 'The current Git commit.')
      .addOption(commander.createOption('--no-git-head').hideHelp())
      .option('-m, --is-modified', 'Does the current commit match the published commit?')
      .addOption(commander.createOption('--no-is-modified').hideHelp());
  },
  after: async ({ log, workspaces, opts }) => {
    const data = await workspaces
      .filter((workspace) => workspace.isSelected)
      .mapAsync(async (workspace) => {
        const {
          name,
          description,
          version,
          scripts,
          keywords,
          type,
          files,
          directories,
          man,
          types,
          bin,
          main,
          module,
          exports,
          dependencies,
          peerDependencies,
          optionalDependencies,
          devDependencies,
          localDependencies,
          localDependents,
          dir,
          isPrivate,
          isRoot,
        } = workspace;

        const [isPublished, npmHead, isRepo, isModified, isDirty, gitHead] = await Promise.all([
          opts.npmIsPublished ? workspace.getNpmIsPublished() : undefined,
          opts.npmHead ? workspace.getNpmHead() : undefined,
          opts.gitIsRepo ? workspace.getGitIsRepo() : undefined,
          opts.gitIsDirty ? workspace.getGitIsDirty() : undefined,
          opts.gitHead ? workspace.getGitHead() : undefined,
          opts.isModified ? workspace.getIsModified() : undefined,
        ]);

        return {
          name,
          description,
          version,
          scripts,
          keywords,
          type,
          files,
          directories,
          man,
          types,
          bin,
          main,
          module,
          exports,
          dependencies,
          peerDependencies,
          optionalDependencies,
          devDependencies,
          localDependencies: localDependencies.map((dependency) => ({
            name: dependency.workspace.name,
            scope: WorkspaceDependencyScope[dependency.scope],
            isDirect: dependency.isDirect,
          })),
          localDependents: localDependents.map((dependent) => ({
            name: dependent.workspace.name,
            scope: WorkspaceDependencyScope[dependent.scope],
            isDirect: dependent.isDirect,
          })),
          dir,
          isPrivate,
          isRoot,
          isPublished,
          isRepo,
          isDirty,
          isModified,
          npmHead,
          gitHead,
        };
      });

    log.write(JSON.stringify(data, null, 2));
  },
});
