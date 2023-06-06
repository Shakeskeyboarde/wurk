import { type PackageJson } from 'type-fest';

import { getKeys } from '../utils/get-keys.js';

export const getWorkspaceDependencyNames = (
  workspace: Pick<PackageJson, 'dependencies' | 'peerDependencies' | 'optionalDependencies' | 'devDependencies'>,
): string[] => {
  return getKeys(
    workspace.dependencies,
    workspace.peerDependencies,
    workspace.optionalDependencies,
    workspace.devDependencies,
  );
};
