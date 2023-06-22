import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { type Spawn } from '@werk/cli';

export interface Change {
  readonly type: string;
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

  const text = await spawn('git', ['log', '--pretty=format:«¦%h¦%B¦»', `${commit}..HEAD`, '--', dir], {
    capture: true,
  }).getStdout('utf-8');

  const entries = [...text.matchAll(/«¦(.*?)¦\s*([^\r\n]*)\s*(?:\n\n\s*(.*?)\s*)?¦»$/gmsu)].map(
    ([, hash = '', subject = '', body = '']) => ({ hash, subject, body }),
  );

  let changes: Change[] = entries
    .flatMap(({ hash, subject, body }): (Change & { hash?: string })[] => {
      const subjectMatch = subject.match(
        /^\s*([a-zA-Z]+|BREAKING[ -]CHANGE)\s*(?:\(\s*(.*?)\s*\))?\s*(!)?\s*:\s*(.*?)\s*$/u,
      );

      if (!subjectMatch) {
        isConventional = false;
        return [];
      }

      const [, type = '', scope, breaking, message = ''] = subjectMatch;

      if (type === 'internal') return [];

      const bodyLines = body.split(/\r?\n/gu);

      return [
        { hash, type: breaking ? 'BREAKING CHANGE' : type, scope, message },
        ...bodyLines.flatMap((line) => {
          const lineMatch = line.match(/^\s*BREAKING[ -]CHANGES?\s*!?\s*:\s*(.*?)\s*$/mu);
          return lineMatch ? [{ hash, type: 'BREAKING CHANGE', message: lineMatch[1] ?? '' }] : [];
        }),
      ];
    })
    .map(({ hash, type, scope, message }) => {
      return {
        type,
        scope: scope?.replace(MARKDOWN_ESCAPE, (char) => `&#${char.charCodeAt(0)};`),
        message: message?.replace(MARKDOWN_ESCAPE, (char) => `&#${char.charCodeAt(0)};`) + (hash ? ` (${hash})` : ''),
      };
    });

  if (changes.length) {
    // Remove duplicate change log entries.
    const changeLogText = await readFile(join(dir, 'CHANGELOG.md'), 'utf-8').catch(() => '');
    changes = changes.filter((change) => !changeLogText.includes(` ${change.message}\n`));
  }

  return [changes, isConventional];
};
