import nodePath from 'node:path';

import { minimatch } from 'minimatch';

import { type Workspace } from './workspace.js';

export type WorkspacePredicate = (workspace: Workspace) => boolean | Promise<boolean>;

export const createWorkspacePredicate = (expression: string): WorkspacePredicate => {
  if (expression.startsWith('/') || expression.startsWith('./')) {
    return (workspace) => minimatch(workspace.relativeDir, nodePath.posix.join('.', expression));
  }

  if (expression.startsWith('#')) {
    return (workspace) => {
      const keyword = expression.slice(1);
      const workspaceKeywords: unknown[] = workspace.config
        .at('keywords')
        .as('array', []);

      return workspaceKeywords.includes(keyword);
    };
  }

  switch (expression) {
    case '@public':
      return (workspace) => !workspace.isPrivate;
    case '@private':
      return (workspace) => workspace.isPrivate;
    case '@published':
      return async (workspace) => await workspace
        .getPublished()
        .then((published) => published?.version === workspace.version);
    case '@unpublished':
      return async (workspace) => await workspace
        .getPublished()
        .then((published) => published?.version !== workspace.version);
    case '@dependency':
    case '@dependencies':
      return (workspace) => workspace.isDependencyOfSelected;
    case '@dependent':
    case '@dependents':
      return (workspace) => workspace.isDependentOfSelected;
  }

  if (!expression.startsWith('@') || expression.includes('/')) {
    return (workspace) => minimatch(workspace.name, expression);
  }

  throw new Error(`invalid workspace filter expression "${expression}"`);
};
