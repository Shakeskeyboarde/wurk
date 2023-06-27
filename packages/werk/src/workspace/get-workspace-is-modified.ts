import assert from 'node:assert';

import { getGitHead } from '../git/get-git-head.js';
import { getGitIsModified } from '../git/get-git-is-modified.js';
import { getGitIsShallow } from '../git/get-git-is-shallow.js';
import { getNpmMetadata } from '../npm/get-npm-metadata.js';
import { log } from '../utils/log.js';

export const getWorkspaceIsModified = async (
  dir: string,
  name: string,
  version: string,
  fromRevision: string | undefined,
  head: string | undefined,
): Promise<boolean> => {
  const [isShallow, meta, to] = await Promise.all([
    getGitIsShallow(dir),
    getNpmMetadata(name, version),
    head ?? getGitHead(dir),
  ]);

  const from = fromRevision ?? meta?.gitHead;
  const isPublished = meta?.version === version;

  log.debug(`Checking if workspace "${name}" is modified (from: ${from}, to: ${to}).`);

  if (!isPublished) return true;

  assert(!isShallow, `Cannot detect modifications because the Git repository is shallow.`);

  return !!from && !!to && (await getGitIsModified(dir, from, to));
};
