import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

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

  const text = await spawn(
    'git',
    ['log', '--pretty=format:%x00%x00%x00%h%x00%x00%B%x00%x00%x00', `${commit}..HEAD`, '--', dir],
    { capture: true },
  ).getStdout('utf-8');

  const entries = [
    ...text.matchAll(/\0{3}([^\r\n\0]+?)\0{2}\s*([^\r\n\0]+)\s*(?:(?:\r?\n){2}\s*([^\0]*?)\s*)?\0{3}$/gmsu),
  ].map(([, hash = '', subject = '', body = '']) => ({ hash, subject, body }));

  let changes: Change[] = entries
    .flatMap(({ hash, subject, body }): Change[] => {
      const subjectMatch = subject.match(
        /^\s*([a-zA-Z]+|BREAKING[ -]CHANGE)\s*(?:\(\s*(.*?)\s*\))?\s*(!)?\s*:\s*(.*?)\s*$/u,
      );

      if (!subjectMatch) {
        isConventional = false;
        return [];
      }

      const [, type = '', scope, breaking, summary = ''] = subjectMatch;
      const message = `${summary} (${hash})`;

      if (type === 'internal') return [];

      const bodyLines = body.split(/\r?\n/gu);

      return [
        { type: breaking ? 'BREAKING CHANGE' : type, scope, message },
        ...bodyLines.flatMap((line) => {
          const lineMatch = line.match(/^\s*BREAKING[ -]CHANGES?\s*!?\s*:\s*(.*?)\s*$/mu);
          return lineMatch ? [{ type: 'BREAKING CHANGE', message: `${lineMatch[1]} (${hash})` }] : [];
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
