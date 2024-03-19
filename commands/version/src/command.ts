import { createCommand, type Workspace } from 'wurk';

import { type ChangeSet } from './change.js';
import { getStrategyCallback, parseStrategy, type Strategy } from './strategy.js';
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
      .option('[strategy]', {
        description:
          'major, minor, patch, premajor, preminor, prepatch, prerelease, auto, promote, or a version number',
        parse: parseStrategy,
      })
      .option('--note <text...>', {
        description: 'add notes to changelog entries',
        key: 'notes',
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
    const { log, workspaces, options, pm, createGit, spawn } = context;
    const git = await createGit()
      .catch(() => null);
    const {
      strategy = 'auto' satisfies Strategy,
      notes = [],
      preid,
      changelog = strategy === 'auto' || notes.filter(Boolean).length > 0,
    } = options;
    const isPreStrategy = typeof strategy === 'string' && strategy.startsWith('pre');
    const changeSets = new Map<Workspace, ChangeSet>();
    const callback = getStrategyCallback(strategy, git, preid);

    if (notes.filter(Boolean).length > 0 && !changelog) {
      log.warn`option --note has no effect when changelogs are disabled`;
    }

    if (preid && !isPreStrategy) {
      log.warn`option --preid only applies to "pre*" strategies`;
    }

    await workspaces.forEach(async (workspace) => {
      const { dir, version, isPrivate } = workspace;

      if (await git?.getIsDirty(dir)) {
        throw new Error('versioning requires a clean git repository');
      }

      if (isPrivate && !version) {
        // Unselect private workspaces if they are unversioned.
        workspace.isSelected = false;
        return;
      }

      const result = await callback(workspace);

      if (result) {
        changeSets.set(workspace, result);
      }
      else {
        // Unselect workspaces where the version strategy is a no-op.
        workspace.isSelected = false;
      }
    });

    // Writing does not use `forEachParallel` because if a workspace write
    // fails (eg. dirty Git working tree), dependent workspace writes should
    // be skipped so that they don't end up referencing non-existent versions.
    await workspaces.forEach(async (workspace) => {
      const changeSet = changeSets.get(workspace)!;

      await writeConfig(workspace, changeSet.version);

      if (changelog) {
        await writeChangelog(workspace, {
          ...changeSet,
          notes: [...changeSet.notes ?? [], ...notes],
        });
      }
    });

    if (!workspaces.selectedSize) return;

    // XXX: NPM records workspace versions in the lockfile. So, the lockfile
    // update has to be triggered by running the update command with a list
    // of the local workspace names to be "updated". Otherwise, the next
    // time the project is restored (ie. `npm install` or `npm ci`), the
    // lockfile will either be updated or the command will fail. Neither
    // option is good in your CI pipeline.
    if (pm === 'npm') {
      await spawn(
        'npm',
        ['update', ...Array.from(workspaces)
          .map(({ name }) => name)],
        { stdio: 'ignore' },
      );
    }

    if (strategy === 'auto') {
      const specs = Array.from(workspaces)
        .flatMap((workspace) => {
          const { name } = workspace;
          const changeSet = changeSets.get(workspace);

          return changeSet
            ? `${name}@${changeSet.version}`
            : [];
        });

      log.info`suggested commit message:`;
      log.info`  chore(release): ${specs.join(', ')}`;
    }
  },
});
