import semver, { type SemVer } from 'semver';
import { createCommand, type Workspace } from 'wurk';

import { type Change } from './change.js';
import { auto } from './strategies/auto.js';
import { increment } from './strategies/increment.js';
import { literal } from './strategies/literal.js';
import { promote } from './strategies/promote.js';
import { writeChangelog, writeConfig } from './write.js';

type Each = (workspace: Workspace) => Promise<readonly Change[] | void>;

const STRATEGIES = {
  major: true,
  minor: true,
  patch: true,
  premajor: true,
  preminor: true,
  prepatch: true,
  prerelease: true,
  auto: true,
  promote: true,
} as const satisfies Record<semver.ReleaseType | 'auto' | 'promote', true>;

export default createCommand('version', {
  config: (cli) => {
    return cli
      .trailer(
        `The "auto" strategy determines the next version for each workspace
         based on conventional-like commit messages added after the closest
         published previous version. Prerelease versions are not supported.`,
      )
      .trailer(
        `The "promote" strategy converts prerelease versions to their release
         equivalent by removing the prerelease identifier. The major, minor,
         and patch versions are not changed.`,
      )
      .option('<strategy>', {
        description:
          'major, minor, patch, premajor, preminor, prepatch, prerelease, auto, promote, or a version number',
        parse: (value): semver.ReleaseType | 'auto' | 'promote' | SemVer => {
          if (value in STRATEGIES) {
            return value as keyof typeof STRATEGIES;
          }

          try {
            return new semver.SemVer(value);
          } catch {
            throw new Error('invalid strategy');
          }
        },
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
    const { log, workspaces, options, autoPrintStatus } = context;

    autoPrintStatus();

    const { strategy, preid, changelog = strategy === 'auto' } = options;
    const isPreStrategy =
      typeof strategy === 'string' && strategy.startsWith('pre');

    if (preid && !isPreStrategy) {
      log.warn`option --preid only applies to "pre*" strategies`;
    }

    const changes = new Map<Workspace, readonly Change[]>();

    let each: Each;

    if (typeof strategy === 'string') {
      switch (strategy) {
        case 'auto':
          each = auto;
          break;
        case 'promote':
          each = promote;
          break;
        default:
          each = increment.bind(null, { releaseType: strategy, preid });
          break;
      }
    } else {
      each = literal.bind(null, { version: strategy });
    }

    await workspaces.forEach(async (workspace) => {
      const git = await workspace.getGit().catch(() => null);

      if (await git?.getIsDirty()) {
        throw new Error('versioning requires a clean git repository');
      }

      if (workspace.isPrivate && !workspace.version) {
        // Unselect private workspaces if they are unversioned.
        workspace.isSelected = false;
        return;
      }

      const workspaceChanges = await each?.(workspace);
      const workspaceNewVersion = workspace.config.at('version').as('string');

      if (!workspaceNewVersion || workspaceNewVersion === workspace.version) {
        // Unselect workspaces where the version strategy is a no-op.
        workspace.isSelected = false;
        return;
      }

      if (workspaceChanges) {
        changes.set(workspace, workspaceChanges);
      }
    });

    // Writing does not use `forEachIndependent` because if a workspace write
    // fails (eg. dirty Git working tree), dependent workspace writes should
    // be skipped so that they don't end up referencing non-existent versions.
    await workspaces.forEach(async (workspace) => {
      workspace.status.set('pending');

      const newVersion = workspace.config.at('version').as('string');

      if (newVersion !== workspace.version) {
        workspace.status.setDetail(`${workspace.version} -> ${newVersion}`);
      }

      await writeConfig(workspace);

      if (changelog) {
        await writeChangelog(workspace, changes.get(workspace));
      }

      workspace.status.set('success');
    });

    if (!workspaces.iterableSize) return;

    await workspaces.root.spawn(
      'npm',
      ['update', ...Array.from(workspaces).map(({ name }) => name)],
      { output: 'ignore' },
    );

    const specs = Array.from(workspaces).flatMap(
      ({ name, version, config }) => {
        const newVersion = config.at('version').as('string');

        return newVersion && newVersion !== version
          ? `${name}@${newVersion}`
          : [];
      },
    );

    log.notice`version commit message:`;
    log.notice({ color: 'blue' })`  release: ${specs.join(', ')}`;
  },
});
