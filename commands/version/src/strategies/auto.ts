import semver, { type ReleaseType } from 'semver';
import { type Git, type GitLog, type Workspace } from 'wurk';

import { type Change, type ChangeSet, ChangeType } from '../change.js';

/**
 * Auto-version the workspace based on conventional commits in the Git history.
 */
export const auto = async (
  git: Git,
  force: boolean,
  workspace: Workspace,
): Promise<ChangeSet | null> => {
  const { log, dir, version: currentVersion, getPublished } = workspace;

  // Auto-versioning does not support workspaces without versions or with
  // prerelease versions.
  if (!currentVersion || semver.prerelease(currentVersion)?.length) {
    log.info`workspace is unversioned or prerelease versioned`;
    return null;
  }

  const info = await getPublished();

  if (!info) {
    log.info`keeping current unpublished version for initial release (${currentVersion})`;
    return { version: currentVersion, notes: ['Initial release.'] };
  }

  if (!info.gitHead) {
    log.warn`auto versioning requires a "gitHead" published to the NPM registry`;
    return null;
  }

  const logs = await git.getLogs(dir, { start: info.gitHead });
  const { isConventional, suggestedReleaseType, changes } = await getChanges(logs);
  const releaseType = suggestedReleaseType ?? (force ? 'patch' : null);

  if (!isConventional) {
    log.warn`workspace has non-conventional commits`;
  }

  if (!releaseType) {
    log.info`no changes detected`;
    return null;
  }

  log.info`detected ${releaseType} changes`;

  const suggestedVersion = new semver.SemVer(info.version)
    .inc(releaseType)
    .format();

  if (semver.lte(suggestedVersion, currentVersion)) {
    log.info`keeping current unpublished version (${currentVersion})`;
    return { version: currentVersion, changes };
  }
  else {
    log.info`updating version (${currentVersion} -> ${suggestedVersion})`;
    return { version: suggestedVersion, changes };
  }
};

/**
 * Get the conventional changes for a set of Git logs.
 */
export const getChanges = async (
  logs: GitLog[],
): Promise<{
  isConventional: boolean;
  suggestedReleaseType: null | Exclude<ReleaseType, `pre${string}`>;
  changes: readonly Change[];
}> => {
  let isConventional = true;

  const changes: Change[] = logs
    .flatMap(({ hash, subject, body }): Change[] => {
      const subjectMatch = subject.match(/^\s*([a-z][a-z- ]+(?<=[a-z]))\s*(?:\((.*?)\)\s*)?(?:!\s*)?:(.*)$/iu);

      if (!subjectMatch) {
        isConventional = false;
        return [];
      }

      let [, typeString = '', scope, summary = ''] = subjectMatch;

      typeString = typeString.trim()
        .toLowerCase();
      scope = scope?.trim();
      summary = summary.trim();

      // Release chore commits are not considered for version bumping and
      // changelog generation, because they are part of the previous release,
      // by definition.
      const type = typeString === 'chore' && scope === 'release'
        ? ChangeType.none
        : CHANGE_TYPES[typeString] ?? ChangeType.fix;
      const message = `${summary} (${hash.slice(0, 7)})`;
      const bodyLines = body.split(/\r?\n/u);

      return [
        { type, scope, message },
        ...bodyLines.flatMap((line) => {
          const lineMatch = line.match(/^\s*break(?:s|ing(?:[ -]?changes?)?)?\s*(?:!\s*)?:(.*)$/imu);

          if (!lineMatch) return [];

          let [, breakingMessage = ''] = lineMatch;

          breakingMessage = breakingMessage.trim();

          return {
            type: ChangeType.breaking,
            scope,
            message: `${breakingMessage} (${hash})`,
          };
        }),
      ];
    })
    .map(({ type, scope, message }) => {
      return {
        type,
        scope: scope?.replace(MARKDOWN_ESCAPE, (char) => {
          return `&#${char.charCodeAt(0)};`;
        }),
        message: message?.replace(MARKDOWN_ESCAPE, (char) => {
          return `&#${char.charCodeAt(0)};`;
        }),
      };
    });

  const suggestedReleaseType = getReleaseType(changes);

  return { isConventional, suggestedReleaseType, changes };
};

const getReleaseType = (changes: readonly Change[]): Exclude<ReleaseType, `pre${string}`> | null => {
  const changeType = changes.reduce<ChangeType>(
    (current, change) => Math.max(current, change.type),
    ChangeType.none,
  );

  switch (changeType) {
    case ChangeType.none:
      return null;
    case ChangeType.breaking:
      return 'major';
    case ChangeType.feat:
      return 'minor';
    default:
      return 'patch';
  }
};

const CHANGE_TYPES: Readonly<Record<string, ChangeType>> = {
  'breaking change': ChangeType.breaking,
  'breaking-change': ChangeType.breaking,
  'breaking changes': ChangeType.breaking,
  'breaking-changes': ChangeType.breaking,
  break: ChangeType.breaking,
  breaks: ChangeType.breaking,
  breaking: ChangeType.breaking,
  major: ChangeType.breaking,
  feat: ChangeType.feat,
  feats: ChangeType.feat,
  feature: ChangeType.feat,
  features: ChangeType.feat,
  featuring: ChangeType.feat,
  minor: ChangeType.feat,
  patch: ChangeType.fix,
  fix: ChangeType.fix,
  fixes: ChangeType.fix,
  fixed: ChangeType.fix,
  fixing: ChangeType.fix,
  refactor: ChangeType.refactor,
  refactors: ChangeType.refactor,
  refactored: ChangeType.refactor,
  improve: ChangeType.improvement,
  improves: ChangeType.improvement,
  improved: ChangeType.improvement,
  improving: ChangeType.improvement,
  improvement: ChangeType.improvement,
  improvements: ChangeType.improvement,
  perf: ChangeType.perf,
  performance: ChangeType.perf,
  test: ChangeType.tests,
  tests: ChangeType.tests,
  tested: ChangeType.tests,
  testing: ChangeType.tests,
  doc: ChangeType.docs,
  docs: ChangeType.docs,
  build: ChangeType.build,
  builds: ChangeType.build,
  building: ChangeType.build,
  ci: ChangeType.ci,
  chore: ChangeType.chore,
  chores: ChangeType.chore,
  revert: ChangeType.revert,
  reverts: ChangeType.revert,
  reverting: ChangeType.revert,
};

const MARKDOWN_ESCAPE = /[#`_*~[\]{}\\]/gu;
