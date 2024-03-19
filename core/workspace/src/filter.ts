import nodePath from 'node:path';

import { minimatch } from 'minimatch';

import { type Workspace } from './workspace.js';

export const filter = async (workspaces: Iterable<Workspace>, expression: string): Promise<Workspace[]> => {
  const pending = Array.from(workspaces)
    .map(async (workspace) => {
      return await match(workspace, expression) ? workspace : null;
    });
  const resolved = await Promise.all(pending);

  return resolved.filter((value): value is Workspace => Boolean(value));
};

const match = async (workspace: Workspace, expression: string): Promise<boolean> => {
  if (expression.startsWith('/') || expression.startsWith('./')) {
    return expression.includes('\\')
      // Not a glob because it contains backslashes.
      ? nodePath.normalize(workspace.relativeDir) === nodePath.join('.', expression)
      : minimatch(workspace.relativeDir, nodePath.posix.join('.', expression));
  }

  if (expression.startsWith('#')) {
    const keywords = expression
      .split(/\s*,\s*/u)
      .map((keyword) => keyword.replace(/^#/u, ''));
    const workspaceKeywords: unknown[] = workspace.config
      .at('keywords')
      .as('array', []);

    // Every keyword is included in the workspace keywords.
    return keywords.every((keyword) => workspaceKeywords.includes(keyword));
  }

  switch (expression) {
    case '@public':
      return !workspace.isPrivate;
    case '@private':
      return workspace.isPrivate;
    case '@published':
      return await workspace.getPublished()
        .then((published) => published?.version === workspace.version);
    case '@unpublished':
      return await workspace.getPublished()
        .then((published) => published?.version !== workspace.version);
    case '@dependency':
      return workspace.isDependencyOfSelected;
    case '@dependent':
      return workspace.isDependentOfSelected;
  }

  return minimatch(workspace.name, expression);
};
