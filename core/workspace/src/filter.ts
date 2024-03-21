import { createWorkspacePredicate, type WorkspacePredicate } from './predicate.js';
import { type Workspace } from './workspace.js';

/**
 * Get a subset of the workspaces filtered by an expression or predicate.
 */
export const filterWorkspaces = async (
  workspaces: Iterable<Workspace>,
  expression: string | WorkspacePredicate,
): Promise<Workspace[]> => {
  const predicate: WorkspacePredicate = typeof expression === 'function'
    ? expression
    : createWorkspacePredicate(expression);

  const pending = Array.from(workspaces)
    .map(async (workspace) => {
      return await predicate(workspace) ? workspace : null;
    });

  const resolved = await Promise.all(pending);

  return resolved.filter((value): value is Workspace => Boolean(value));
};
