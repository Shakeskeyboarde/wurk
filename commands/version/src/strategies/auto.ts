import semver, { type ReleaseType } from 'semver';
import { type Fs, type Git, type Workspace } from 'wurk';

import { type Change, ChangeType } from '../change.js';

export const auto = async (
  workspace: Workspace,
): Promise<readonly Change[]> => {
  const { log, config, version, fs, getNpm, getGit } = workspace;

  // Auto-versioning does not support workspaces without versions or with
  // prerelease versions.
  if (!version || semver.prerelease(version)?.length) {
    log.debug`workspace is unversioned or prerelease versioned`;
    return [];
  }

  const npm = await getNpm();
  const meta = await npm.getMetadata();

  if (!meta) {
    log.info`using existing version for initial release (${version})`;
    return [];
  }

  if (!meta.gitHead) {
    log.warn`auto versioning requires a "gitHead" published to the NPM registry`;
    return [];
  }

  const git = await getGit().catch(() => null);

  if (!git) {
    log.warn`auto versioning requires a Git repository`;
    return [];
  }

  const { isConventional, releaseType, changes } = await getChanges(
    fs,
    git,
    meta.gitHead,
  );

  if (!isConventional) {
    log.warn`workspace has non-conventional commits`;
  }

  if (!releaseType) {
    log.info`no changes detected`;
    return [];
  }

  const newVersion = new semver.SemVer(version).inc(releaseType).format();

  log.info`detected ${releaseType} changes (${version} -> ${newVersion})`;
  config.at('version').set(newVersion);

  return changes;
};

export const getChanges = async (
  fs: Fs,
  git: Git,
  publishedHead: string,
): Promise<{
  isConventional: boolean;
  releaseType: null | Exclude<ReleaseType, `pre${string}`>;
  changes: readonly Change[];
}> => {
  const logs = await git.getLogs({ start: publishedHead });

  let isConventional = true;
  let changes: Change[] = logs
    .flatMap(({ hash, subject, body }): Change[] => {
      const subjectMatch = subject.match(
        /^\s*([a-z][a-z- ]+(?<=[a-z]))\s*(?:\((.*?)\)\s*)?(?:!\s*)?:(.*)$/iu,
      );

      if (!subjectMatch) {
        isConventional = false;
        return [];
      }

      let [, typeString = '', project, summary = ''] = subjectMatch;

      typeString = typeString.trim().toLowerCase();
      project = project?.trim();
      summary = summary.trim();

      const type = /none|internal|version(?:ed|ing)|releas(?:ed?|ing)/u.test(
        typeString,
      )
        ? ChangeType.none
        : CHANGE_TYPES[typeString] ?? ChangeType.fix;
      const message = `${summary} (${hash})`;
      const bodyLines = body.split(/\r?\n/u);

      return [
        { type, project, message },
        ...bodyLines.flatMap((line) => {
          const lineMatch = line.match(
            /^\s*break(?:s|ing(?:[ -]?changes?)?)?\s*(?:!\s*)?:(.*)$/imu,
          );

          if (!lineMatch) return [];

          let [, breakingMessage = ''] = lineMatch;

          breakingMessage = breakingMessage.trim();

          return {
            type: ChangeType.breaking,
            message: `${breakingMessage} (${hash})`,
          };
        }),
      ];
    })
    .map(({ type, project, message }) => {
      return {
        type,
        project: project?.replace(MARKDOWN_ESCAPE, (char) => {
          return `&#${char.charCodeAt(0)};`;
        }),
        message: message?.replace(MARKDOWN_ESCAPE, (char) => {
          return `&#${char.charCodeAt(0)};`;
        }),
      };
    });

  if (changes.length) {
    // Remove duplicate changelog entries.
    const changeLogText = await fs
      .readText('CHANGELOG.md')
      .then((text) => text ?? '');

    changes = changes.filter(
      (change) => !changeLogText.includes(` ${change.message}\n`),
    );
  }

  const releaseType = getReleaseType(changes);

  return { isConventional, releaseType, changes };
};

const getReleaseType = (
  changes: readonly Change[],
): Exclude<ReleaseType, `pre${string}`> | null => {
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
  note: ChangeType.note,
  notes: ChangeType.note,
};

const MARKDOWN_ESCAPE = /[#`_*~[\]{}\\]/gu;
