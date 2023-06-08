import { getKeys } from '../utils/get-keys.js';
import { type WorkspaceOptions } from './workspace.js';

export const getWorkspaceDependencyNames = (workspace: WorkspaceOptions): string[] => {
  return getKeys(
    workspace.dependencies,
    workspace.peerDependencies,
    workspace.optionalDependencies,
    workspace.devDependencies,
  );
};
