import { type PackageJson } from 'type-fest';

import { getWorkspaceDependencyNames } from './get-workspace-dependency-names.js';

export const getDependencyOrderedWorkspaces = <
  T extends Pick<PackageJson, 'dependencies' | 'peerDependencies' | 'optionalDependencies' | 'devDependencies'> & {
    readonly name: string;
  },
>(
  workspaces: readonly T[],
): T[] => {
  const unresolved = new Map(workspaces.map((workspace) => [workspace.name, workspace]));
  const localNames = new Set(unresolved.keys());
  const resolvedNames = new Set<string>();
  const result: T[] = [];

  while (unresolved.size) {
    let count = 0;

    unresolved.forEach((workspace) => {
      const isBlocked = [...getWorkspaceDependencyNames(workspace)].some(
        (name) => localNames.has(name) && !resolvedNames.has(name),
      );

      if (isBlocked) return;

      count++;
      unresolved.delete(workspace.name);
      resolvedNames.add(workspace.name);
      result.push(workspace);
    });

    if (count === 0) throw new Error('Circular dependencies detected!');
  }

  return result;
};
