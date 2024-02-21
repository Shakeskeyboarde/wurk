import semver, { type SemVer } from 'semver';
import { createCommand, type Workspace } from 'wurk';

import { type Change } from './change.js';
import { auto } from './strategies/auto.js';
import { bump } from './strategies/bump.js';
import { literal } from './strategies/literal.js';
import { promote } from './strategies/promote.js';
import { sync } from './sync.js';
import { writeChangelog, writeConfig } from './write.js';

const STRATEGIES: Readonly<Record<semver.ReleaseType | 'auto' | 'promote' | 'sync', true>> = {
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
};

export default createCommand('version', {
  config: (cli) => {
    return cli
      .trailer(
        `The "auto" strategy determines the next version for each workspace
         based on semantic-like commit messages added after the closest
         published previous version. Prerelease versions are not supported.`,
      )
      .trailer(
        `The "promote" strategy converts prerelease versions to their release
         equivalent by removing the prerelease identifier. The major, minor,
         and patch versions are not changed.`,
      )
      .trailer(
        `All strategies also update local dependencies to match new workspace
         versions. Workspace versions may be incremented if their dependencies
         are updated even if the workspace unselected or unaffected by the
         strategy. To prevent unnecessary version/publish churn, local
         dependency ranges that already include the current workspace version
         are not updated, unless the dependent workspace is also being updated
         or the workspace is private (unpublishable).`,
      )
      .option('<strategy>', {
        description:
          'major, minor, patch, premajor, preminor, prepatch, prerelease, auto, promote, or a version number',
        parse: (value): semver.ReleaseType | 'auto' | 'promote' | 'sync' | SemVer => {
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
      .option('--changelog', 'add changelog entries (default for the "auto" strategy)')
      .option('--no-changelog', 'do not add changelog entries (default for non-"auto" strategies)')
      .optionNegation('changelog', 'noChangelog')
      .option('--dry-run', 'display proposed version changes without writing files');
  },

  run: async (context) => {
    const { log, workspaces, options, autoPrintStatus } = context;
    const { strategy, preid, changelog = strategy === 'auto', dryRun = false } = options;

    autoPrintStatus();

    if (preid && (typeof strategy !== 'string' || !strategy.startsWith('pre'))) {
      log.warn('option --preid only applies to "pre*" strategies');
    }

    const changes = new Map<Workspace, readonly Change[]>();

    if (strategy !== 'sync') {
      let each: (workspace: Workspace) => Promise<readonly Change[] | undefined | null | void>;

      if (typeof strategy === 'string') {
        switch (strategy) {
          case 'auto':
            each = auto;
            break;
          case 'promote':
            each = promote;
            break;
          default:
            each = (workspace) => bump(workspace, { releaseType: strategy, preid });
            break;
        }
      } else {
        each = (workspace) => literal(workspace, { version: strategy });
      }

      await workspaces.forEach(async (workspace) => {
        if (workspace.isPrivate) {
          workspace.log.debug('skipping workspace (private)');
        }
        changes.set(workspace, (await each(workspace)) ?? []);
      });
    }

    // When a selected workspace version is updated, dependents may need a
    // their local dependency version ranges updates to match the new version.
    workspaces.includeDependents();
    workspaces.forEachSync((workspace) => {
      changes.set(workspace, [...(changes.get(workspace) ?? []), ...sync(workspace)]);
    });

    // Writing does not use `forEachIndependent` because if a workspace write
    // fails (eg. dirty Git working tree), dependent workspace writes should
    // be skipped so that they don't end up referencing non-existent versions.
    await workspaces.forEach(async (workspace) => {
      const { status, version, config, git, pinFile } = workspace;

      if (!config.isModified) {
        log.debug('skipping update (no modifications)');
        status.set('skipped', 'no modifications');
        return;
      }

      if ((await git.getIsRepo()) && (await git.getIsDirty())) {
        throw new Error('versioning requires a clean git repository');
      }

      const newVersion = config.at('version').as('string');

      status.set('pending', version !== newVersion ? `${version} -> ${newVersion}` : 'no version change');

      if (dryRun) {
        pinFile('package.json');
        pinFile('package-lock.json');
      }

      await writeConfig(workspace);

      if (changelog) {
        if (dryRun) {
          pinFile('CHANGELOG.md');
        }

        await writeChangelog(workspace, changes.get(workspace));
      }

      status.set('success');
    });

    const updated = Array.from(workspaces).filter(({ config }) => config.isModified);

    if (updated.length) {
      await workspaces.root.spawn('npm', ['update', ...updated.map(({ name }) => name)], {
        output: 'ignore',
      });
    }

    const versioned = updated.filter(({ version, config }) => version !== config.at('version').as('string'));

    if (versioned) {
      const releaseMessage = versioned
        .map(({ name, version }) => `${name.replace(/^@[^/]*/u, '')}@${version}`)
        .join(', ');

      if (releaseMessage) {
        log.notice(`version commit message:`);
        log.notice(`  release: ${releaseMessage}`, { color: 'blue' });
      }
    }
  },
});