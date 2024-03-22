import { type WorkspaceDependencySpec } from './spec.js';

/**
 * A dependency in a workspace's `package.json` file.
 */
export interface WorkspaceDependency {
  /**
   * The type of the dependency in the dependent workspace's `package.json`
   * file (eg. `devDependencies`).
   */
  readonly type: WorkspaceDependencyType;

  /**
   * The key of the dependency in the dependent workspace's `package.json`
   * file. This may not be the same as the dependency's package name if the
   * entry is an alias.
   */
  readonly id: string;

  /**
   * The dependency spec.
   */
  readonly spec: WorkspaceDependencySpec;
}

/**
 * A dependency type key which corresponds to the key of a dependency map in a
 * `package.json` file.
 */
export type WorkspaceDependencyType = typeof WORKSPACE_DEPENDENCY_TYPES[number];

/**
 * Array of dependency type keys.
 */
export const WORKSPACE_DEPENDENCY_TYPES = [
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
  'dependencies',
] as const;
