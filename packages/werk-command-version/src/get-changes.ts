import { type Spawn } from '@werk/cli';

export interface Change {
  readonly hash?: string;
  readonly type: string;
  readonly scope?: string;
  readonly message: string;
}

const MARKDOWN_ESCAPE = /[#`_*~[\]{}\\]/gu;

export const getChanges = async (spawn: Spawn, commit: string, dir: string): Promise<readonly Change[]> => {
  const log = await spawn('git', ['log', '--pretty=format:«¦%h¦%B¦»', `${commit}..HEAD`, '--', dir], {
    capture: true,
  }).getStdout('utf-8');
  const entries = [...log.matchAll(/«¦(.*?)¦\s*([^\r\n]*)\s*(?:\n\n\s*(.*?)\s*)?¦»$/gmsu)].map(
    ([, hash = '', subject = '', body = '']) => ({ hash, subject, body }),
  );

  const changes: Change[] = entries
    .flatMap(({ hash, subject, body }): Change[] => {
      const subjectMatch = subject.match(
        /^\s*([a-zA-Z]+|BREAKING[ -]CHANGE)\s*(?:\(\s*(.*?)\s*\))?\s*(!)?\s*:\s*(.*?)\s*$/u,
      );

      if (!subjectMatch) return [];

      const [, type = '', scope, breaking, message = ''] = subjectMatch;
      const bodyLines = body.split(/\r?\n/gu);

      return [
        { hash, type: breaking ? 'BREAKING CHANGE' : type, scope, message },
        ...bodyLines.flatMap((line) => {
          const lineMatch = line.match(/^\s*BREAKING[ -]CHANGES?\s*!?\s*:\s*(.*?)\s*$/mu);
          return lineMatch ? [{ hash, type: 'BREAKING CHANGE', message: lineMatch[1] ?? '' }] : [];
        }),
      ];
    })
    .map((change) => {
      return {
        ...change,
        scope: change.scope?.replace(MARKDOWN_ESCAPE, (char) => `&#${char.charCodeAt(0)};`),
        message: change.message?.replace(MARKDOWN_ESCAPE, (char) => `&#${char.charCodeAt(0)};`),
      };
    });

  if (changes.length === 0 && log.length > 0) {
    changes.push({ type: 'note', message: 'No significant changes.' });
  }

  return changes;
};
