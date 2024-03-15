import { createCommand, type Workspace } from 'wurk';

import { getStrategyCallback, parseStrategy, type StrategyResult } from './strategy.js';
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
    const { log, workspaces, options, pm, createGit, spawn } = context;
    const git = await createGit()
      .catch(() => null);
    const { strategy, preid, changelog = strategy === 'auto' } = options;
    const isPreStrategy = typeof strategy === 'string' && strategy.startsWith('pre');
    const results = new Map<Workspace, StrategyResult>();
    const callback = getStrategyCallback(strategy, git, preid);

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

      if (result && result.version !== version) {
        results.set(workspace, result);
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
      const { version, changes } = results.get(workspace)!;

      await writeConfig(workspace, version);

      if (changelog) {
        await writeChangelog(workspace, changes);
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
          const result = results.get(workspace);

          return result
            ? `${name}@${result.version}`
            : [];
        });

      log.notice`version suggested commit message:`;
      log.notice({ color: 'blue' })`  chore(release): ${specs.join(', ')}`;
    }
  },
});
