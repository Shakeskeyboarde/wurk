import { getKeys } from '../utils/get-keys.js';
import { type WorkspacePackage } from './workspace-package.js';

export const getWorkspaceDependencyNames = (
  workspace: Pick<WorkspacePackage, 'dependencies' | 'peerDependencies' | 'optionalDependencies' | 'devDependencies'>,
): string[] => {
  return getKeys(
    workspace.dependencies,
    workspace.peerDependencies,
    workspace.optionalDependencies,
    workspace.devDependencies,
  );
};
