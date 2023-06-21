import * as semver from 'semver';

import { getWorkspaceDependencyNames } from './get-workspace-dependency-names.js';
import { type WorkspacePackage } from './workspace-package.js';

export interface WorkspaceLocalDependenciesOptions {
  scopes?: ('dependencies' | 'peerDependencies' | 'optionalDependencies' | 'devDependencies')[];
}

export const getWorkspaceLocalDependencies = <
  T extends Pick<
    WorkspacePackage,
    'name' | 'version' | 'dependencies' | 'peerDependencies' | 'optionalDependencies' | 'devDependencies'
  >,
>(
  workspace: T,
  workspaces: Iterable<T>,
  options: WorkspaceLocalDependenciesOptions = {},
): T[] => {
  const workspacesArray = Array.from(workspaces);
  const dependencyNames = getWorkspaceDependencyNames(workspace);
  const { scopes = ['dependencies', 'peerDependencies', 'optionalDependencies', 'devDependencies'] } = options;

  return Array.from(
    new Set(
      dependencyNames.flatMap((name) => {
        const dependency = workspacesArray.find((value) => value.name === name);

        // Not a local dependency (no matching workspace).
        if (!dependency) return [];

        for (const scope of scopes) {
          const versionRange = workspace[scope]?.[name];

          // Not in this dependency scope.
          if (!versionRange) {
            continue;
          }

          // Not a local dependency (version doesn't match version range).
          if (semver.valid(dependency.version) && !semver.satisfies(dependency.version, versionRange)) continue;

          // This is a dependency on a local workspace.
          return [dependency, ...getWorkspaceLocalDependencies(dependency, workspacesArray, options)];
        }

        // Not in an applicable dependency scope.
        return [];
      }),
    ),
  );
};
