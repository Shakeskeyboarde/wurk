import { createCommand, type Workspace } from 'wurk';

import { type Change } from './change.js';
import { getStrategyCallback, parseStrategy } from './strategy.js';
import { writeChangelog, writeConfig } from './write.js';

export default createCommand('version', {
  config: (cli) => {
    return cli
      .trailer(`The "auto" strategy determines the next version for each workspace
         based on conventional-like commit messages added after the closest
         published previous version. Prerelease versions are not supported.`)
      .trailer(`The "promote" strategy converts prerelease versions to their release
         equivalent by removing the prerelease identifier. The major, minor,
         and patch versions are not changed.`)
      .option('<strategy>', {
        description:
          'major, minor, patch, premajor, preminor, prepatch, prerelease, auto, promote, or a version number',
        parse: parseStrategy,
      })
      .option('--preid <id>', 'set the identifier for prerelease versions')
      .option(
        '--changelog',
        'add changelog entries (default for the "auto" strategy)',
      )
      .option(
        '--no-changelog',
        'do not add changelog entries (default for non-"auto" strategies)',
      )
      .optionNegation('changelog', 'noChangelog');
  },

  action: async (context) => {
    const { log, pm, workspaces, options, autoPrintStatus, createGit }
      = context;
    const git = await createGit()
      .catch(() => null);
    const { strategy, preid, changelog = strategy === 'auto' } = options;
    const isPreStrategy
      = typeof strategy === 'string' && strategy.startsWith('pre');
    const changes = new Map<Workspace, readonly Change[]>();
    const callback = getStrategyCallback(strategy, pm, git, preid);

    autoPrintStatus();

    if (preid && !isPreStrategy) {
      log.warn`option --preid only applies to "pre*" strategies`;
    }

    await workspaces.forEach(async (workspace) => {
      const { config, version, isPrivate } = workspace;

      if (await git?.getIsDirty()) {
        throw new Error('versioning requires a clean git repository');
      }

      if (isPrivate && !version) {
        // Unselect private workspaces if they are unversioned.
        workspace.isSelected = false;
        return;
      }

      const workspaceChanges = await callback(workspace);
      const workspaceNewVersion = config
        .at('version')
        .as('string');

      if (!workspaceNewVersion || workspaceNewVersion === version) {
        // Unselect workspaces where the version strategy is a no-op.
        workspace.isSelected = false;
        return;
      }

      if (workspaceChanges) {
        changes.set(workspace, workspaceChanges);
      }
    });

    // Writing does not use `forEachParallel` because if a workspace write
    // fails (eg. dirty Git working tree), dependent workspace writes should
    // be skipped so that they don't end up referencing non-existent versions.
    await workspaces.forEach(async (workspace) => {
      const { status, config, version } = workspace;

      status.set('pending');

      const newVersion = config
        .at('version')
        .as('string');

      if (newVersion !== version) {
        status.setDetail(`${version} -> ${newVersion}`);
      }

      await writeConfig(workspace);

      if (changelog) {
        await writeChangelog(workspace, changes.get(workspace));
      }

      status.set('success');
    });

    if (!workspaces.iterableSize) return;

    await workspaces.root.spawn(
      'npm',
      ['update', ...Array.from(workspaces)
        .map(({ name }) => name)],
      { output: 'ignore' },
    );

    const specs = Array.from(workspaces)
      .flatMap(({ name, version, config }) => {
        const newVersion = config
          .at('version')
          .as('string');

        return newVersion && newVersion !== version
          ? `${name}@${newVersion}`
          : [];
      });

    log.notice`version commit message:`;
    log.notice({ color: 'blue' })`  release: ${specs.join(', ')}`;
  },
});
