import path from 'node:path';

import { fs } from '@wurk/fs';
import { type JsonAccessor } from '@wurk/json';
import { spawn } from '@wurk/spawn';

export interface NpmQueryResult {
  readonly dir: string;
  readonly config: JsonAccessor;
}

const getNpmQuery = async (selector: string): Promise<NpmQueryResult[]> => {
  const results = await spawn('npm', [
    'query',
    selector,
    '--quiet',
    '--json',
  ]).stdoutJson();

  return await Promise.all(
    results.map(async (result): Promise<NpmQueryResult> => {
      const dir =
        result.at('realpath').as('string') ?? result.at('path').as('string')!;
      const config = await fs.readJson(path.join(dir, 'package.json'));

      return { dir, config };
    }) ?? [],
  );
};

export const getNpmRoot = async (): Promise<NpmQueryResult> => {
  return await getNpmQuery(':root').then(([workspace]) => workspace!);
};

export const getNpmWorkspaces = async (): Promise<NpmQueryResult[]> => {
  return await getNpmQuery('.workspace');
};
