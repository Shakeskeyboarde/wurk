import { type ReleaseType } from 'semver';
import { type Workspace } from 'wurk';

export interface Change {
  readonly type: ChangeType;
  readonly scope?: string;
  readonly message: string;
}

/**
 * Enum values are in order of increasing severity.
 */
export enum ChangeType {
  none,
  note,
  docs,
  ci,
  perf,
  tests,
  build,
  chore,
  refactor,
  improvement,
  revert,
  fix,
  feat,
  breaking,
}

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

export const getChanges = async (
  workspace: Workspace,
  npmHead: string,
): Promise<{
  isConventional: boolean;
  releaseType: null | Exclude<ReleaseType, `pre${string}`>;
  changes: readonly Change[];
}> => {
  const { log, git, fs } = workspace;

  if (!npmHead) {
    log.debug('npm head commit not available');
    return { isConventional: true, releaseType: null, changes: [] };
  }

  const logs = await git.getLogs(npmHead);

  let isConventional = true;
  let changes: Change[] = logs
    .flatMap(({ hash, subject, body }): Change[] => {
      const subjectMatch = subject.match(/^\s*([a-z][a-z- ]+(?<=[a-z]))\s*(?:\((.*?)\)\s*)?(?:!\s*)?:(.*)$/iu);

      if (!subjectMatch) {
        isConventional = false;
        return [];
      }

      let [, typeString = '', scope, summary = ''] = subjectMatch;

      typeString = typeString.trim().toLowerCase();
      scope = scope?.trim();
      summary = summary.trim();

      const type = /none|internal|version(?:ed|ing)|releas(?:ed?|ing)/u.test(typeString)
        ? ChangeType.none
        : CHANGE_TYPES[typeString] ?? ChangeType.fix;
      const message = `${summary} (${hash})`;
      const bodyLines = body.split(/\r?\n/u);

      return [
        { type, scope, message },
        ...bodyLines.flatMap((line) => {
          const lineMatch = line.match(/^\s*break(?:s|ing(?:[ -]?changes?)?)?\s*(?:!\s*)?:(.*)$/imu);

          if (!lineMatch) return [];

          let [, breakingMessage = ''] = lineMatch;

          breakingMessage = breakingMessage.trim();

          return { type: ChangeType.breaking, message: `${breakingMessage} (${hash})` };
        }),
      ];
    })
    .map(({ type, scope, message }) => {
      return {
        type,
        scope: scope?.replace(MARKDOWN_ESCAPE, (char) => `&#${char.charCodeAt(0)};`),
        message: message?.replace(MARKDOWN_ESCAPE, (char) => `&#${char.charCodeAt(0)};`),
      };
    });

  if (changes.length) {
    // Remove duplicate changelog entries.
    const changeLogText = await fs.readText('CHANGELOG.md').catch(() => '');
    changes = changes.filter((change) => !changeLogText.includes(` ${change.message}\n`));
  }

  const releaseType = getReleaseType(changes);

  return { isConventional, releaseType, changes };
};

const getReleaseType = (changes: readonly Change[]): Exclude<ReleaseType, `pre${string}`> | null => {
  const changeType = changes.reduce<ChangeType>((current, change) => Math.max(current, change.type), ChangeType.none);

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
