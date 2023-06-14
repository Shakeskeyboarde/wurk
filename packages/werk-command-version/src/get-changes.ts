import { type Spawn } from '@werk/cli';

export interface Change {
  hash?: string;
  type: string;
  scope?: string;
  message: string;
}

export const getChanges = async (spawn: Spawn, commit: string, dir: string): Promise<readonly Change[]> => {
  const log = await spawn('git', ['log', '--pretty=format:«¦%h¦%B¦»', `${commit}..HEAD`, '--', dir], {
    capture: true,
  }).getStdout('utf-8');
  const entries = [...log.matchAll(/«¦(.*?)¦\s*([^\r\n]*)\s*(?:\n\n\s*(.*?)\s*)?¦»$/gmsu)].map(
    ([, hash = '', subject = '', body = '']) => ({ hash, subject, body }),
  );

  return entries.flatMap(({ hash, subject, body }): Change[] => {
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
  });
};
