import semver, { type SemVer } from 'semver';
import { createCommand, type Workspace } from 'wurk';

import { type Change } from './change.js';
import { auto } from './strategies/auto.js';
import { bump } from './strategies/bump.js';
import { literal } from './strategies/literal.js';
import { promote } from './strategies/promote.js';
import { sync } from './sync.js';
import { writeChangelog, writeConfig } from './write.js';

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
  sync: true,
} as const satisfies Record<
  semver.ReleaseType | 'auto' | 'promote' | 'sync',
  true
>;

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
        parse: (
          value,
        ): semver.ReleaseType | 'auto' | 'promote' | 'sync' | SemVer => {
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

    if (strategy !== 'sync') {
      let each: (
        workspace: Workspace,
      ) => Promise<readonly Change[] | undefined | null | void>;

      if (typeof strategy === 'string') {
        switch (strategy) {
          case 'auto':
            each = auto;
            break;
          case 'promote':
            each = promote;
            break;
          default:
            each = (workspace) => {
              return bump(workspace, { releaseType: strategy, preid });
            };
            break;
        }
      } else {
        each = (workspace) => literal(workspace, { version: strategy });
      }

      await workspaces.forEach(async (workspace) => {
        if (workspace.isPrivate) {
          workspace.log.debug`skipping workspace (private)`;
        }

        changes.set(workspace, (await each(workspace)) ?? []);
      });
    }

    // When a selected workspace version is updated, dependents may need a
    // their version and local dependency version ranges updated.
    workspaces.includeDependents();
    workspaces.forEachSync((workspace) => {
      const { config, version, isPrivate, getDependencyLinks } = workspace;

      // Update local dependency version ranges.
      changes.set(workspace, [
        ...(changes.get(workspace) ?? []),
        ...sync(workspace),
      ]);

      const newVersion = config.at('version').as('string');
      const isVersionUpdated = newVersion && newVersion !== version;

      if (!isVersionUpdated && version && !isPrivate) {
        const isIncrementRequired = getDependencyLinks().some(
          ({ dependency }) => {
            const newDependencyVersion = dependency.config
              .at('version')
              .as('string');

            return (
              newDependencyVersion &&
              newDependencyVersion !== dependency.version
            );
          },
        );

        // If dependency versions are updated, then bump the workspace version
        // so that bug fixes in dependencies are picked up by consumers of
        // dependents.
        if (isIncrementRequired) {
          const newIncrementedVersion = new semver.SemVer(version)
            .inc(semver.prerelease(version)?.length ? 'prerelease' : 'patch')
            .format();

          config.at('version').set(newIncrementedVersion);
        }
      }
    });

    // Update workspace selection to reflect the workspaces which should be
    // published.
    await workspaces.forEach(async (workspace) => {
      const git = await workspace.getGit().catch(() => null);

      if (await git?.getIsDirty()) {
        throw new Error('versioning requires a clean git repository');
      }

      if (workspace.config.isModified) {
        workspace.isSelected = true;
      } else {
        workspace.log.debug`skipping workspace update (no modifications)`;
        workspace.status.set('skipped', 'no modifications');
        workspace.isSelected = false;
      }
    });

    // Disable iteration over non-selected workspaces.
    workspaces.includeDependencies(false);
    workspaces.includeDependents(false);

    // Writing does not use `forEachIndependent` because if a workspace write
    // fails (eg. dirty Git working tree), dependent workspace writes should
    // be skipped so that they don't end up referencing non-existent versions.
    await workspaces.forEach(async (workspace) => {
      workspace.status.set('pending');

      const newVersion = workspace.config.at('version').as('string');

      if (workspace.version !== newVersion) {
        workspace.status.setDetail(`${workspace.version} -> ${newVersion}`);
      }

      await writeConfig(workspace);

      if (changelog) {
        await writeChangelog(workspace, changes.get(workspace));
      }

      workspace.status.set('success');
    });

    const updated = Array.from(workspaces).filter(({ config }) => {
      return config.isModified;
    });

    if (updated.length) {
      await workspaces.root.spawn(
        'npm',
        ['update', ...updated.map(({ name }) => name)],
        { output: 'ignore' },
      );
    }

    const versioned = updated.filter(({ version, config }) => {
      return version !== config.at('version').as('string');
    });

    if (versioned) {
      const releaseMessage = versioned
        .map(({ name, version }) => {
          return `${name}@${version}`;
        })
        .join(', ');

      if (releaseMessage) {
        log.notice`version commit message:`;
        log.notice({ color: 'blue' })`  release: ${releaseMessage}`;
      }
    }
  },
});
