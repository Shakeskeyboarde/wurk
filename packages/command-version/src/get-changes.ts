import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { type Spawn } from '@werk/cli';

export enum ChangeType {
  none,
  breaking,
  feat,
  fix,
  refactor,
  improvement,
  perf,
  tests,
  docs,
  build,
  ci,
  chore,
  revert,
  note,
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

export interface Change {
  readonly type: ChangeType;
  readonly scope?: string;
  readonly message: string;
}

const MARKDOWN_ESCAPE = /[#`_*~[\]{}\\]/gu;

export const getChanges = async (
  commit: string,
  dir: string,
  spawn: Spawn,
): Promise<[changes: readonly Change[], isConventional: boolean]> => {
  let isConventional = true;

  const text = await spawn(
    'git',
    ['log', '--pretty=format:%x00%x00%x00%h%x00%x00%B%x00%x00%x00', `${commit}..HEAD`, '--', dir],
    { capture: true },
  ).getStdout('utf-8');

  const entries = [...text.matchAll(/\0{3}([^\0]*)\0{2}([^\0]*)\0{3}$/gmu)].flatMap(([, hash, message]) => {
    if (!hash || !message) return [];

    let [subject, body = ''] = message.split(/\0{2}/u, 2);

    hash = hash?.trim();
    subject = subject?.trim();
    body = body.trim();

    if (!subject) return [];

    return { hash, subject, body };
  });

  let changes: Change[] = entries
    .flatMap(({ hash, subject, body }): Change[] => {
      const subjectMatch = subject.match(/^\s*([a-z-]+)\s*(?:\((.*?)\)\s*)?(?:!\s*)?:(.*)$/iu);

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
    const changeLogText = await readFile(resolve(dir, 'CHANGELOG.md'), 'utf-8').catch(() => '');
    changes = changes.filter((change) => !changeLogText.includes(` ${change.message}\n`));
  }

  return [changes, isConventional];
};
