import { isAbsolute, resolve } from 'node:path';

import { getNpmMetadata } from '../npm/get-npm-metadata.js';
import { type GitOptions, type SelectOptions } from '../options.js';
import { memoize } from '../utils/memoize.js';
import { getWorkspaceDependencyNames } from './get-workspace-dependency-names.js';
import { getWorkspaceIsModified } from './get-workspace-is-modified.js';
import { getWorkspaceLocalDependencies } from './get-workspace-local-dependencies.js';
import { type WorkspaceOptions } from './workspace.js';
import { type WorkspacePackage } from './workspace-package.js';

export type WorkspacePartialOptions = Omit<
  WorkspaceOptions,
  'context' | 'gitHead' | 'gitFromRevision' | 'saveAndRestoreFile'
>;

export interface WorkspacesOptions extends GitOptions, SelectOptions {
  readonly workspacePackages: readonly WorkspacePackage[];
  readonly rootDir: string;
  readonly commandName: string;
}

const getSorted = (workspaces: readonly WorkspacePackage[]): readonly WorkspacePackage[] => {
  const unresolved = new Map(workspaces.map((workspace) => [workspace.name, workspace]));
  const localNames = new Set(unresolved.keys());
  const resolvedNames = new Set<string>();
  const result: WorkspacePackage[] = [];

  while (unresolved.size) {
    let count = 0;

    unresolved.forEach((workspace) => {
      if (getWorkspaceDependencyNames(workspace).some((name) => localNames.has(name) && !resolvedNames.has(name))) {
        return;
      }

      count++;
      unresolved.delete(workspace.name);
      resolvedNames.add(workspace.name);
      result.push(workspace);
    });

    if (count === 0) throw new Error('Circular dependencies detected!');
  }

  return result;
};

const getSelected = async (
  workspaces: readonly WorkspacePackage[],
  rootDir: string,
  {
    withDependencies,
    includeWorkspaces,
    includeKeywords,
    excludeWorkspaces,
    excludeKeywords,
    excludePrivate,
    excludePublic,
    excludePublished,
    excludeUnpublished,
    excludeModified,
    excludeUnmodified,
    gitFromRevision,
    gitHead,
  }: SelectOptions & GitOptions,
): Promise<readonly (WorkspacePackage & { selected: boolean })[]> => {
  const getIsPublished = async (name: string, version: string): Promise<boolean> => {
    return await getNpmMetadata(name, version).then((meta) => meta?.version === version);
  };

  const getIsModified = memoize(getWorkspaceIsModified, (...args) => JSON.stringify(args));

  let result = await Promise.all(
    Array.from(workspaces).map(async (workspace) => {
      let isExcluded =
        excludeWorkspaces.some((nameOrPath) => isWorkspaceMatch(workspace, rootDir, nameOrPath)) ||
        Boolean(workspace.keywords?.some((keyword) => excludeKeywords.includes(keyword))) ||
        (excludePrivate && workspace.private) ||
        (excludePublic && !workspace.private);

      if (!isExcluded && excludePublished) {
        isExcluded = await getIsPublished(workspace.name, workspace.version);
      }

      if (isExcluded && excludeUnpublished) {
        isExcluded = !(await getIsPublished(workspace.name, workspace.version));
      }

      if (!isExcluded && excludeModified) {
        isExcluded = await getIsModified(workspace.dir, workspace.name, workspace.version, gitFromRevision, gitHead);
      }

      if (!isExcluded && excludeUnmodified) {
        isExcluded = !(await getIsModified(workspace.dir, workspace.name, workspace.version, gitFromRevision, gitHead));
      }

      if (isExcluded) {
        return { ...workspace, selected: false };
      }

      const isIncluded =
        (!includeWorkspaces.length && !includeKeywords.length) ||
        includeWorkspaces.some((nameOrPath) => isWorkspaceMatch(workspace, rootDir, nameOrPath)) ||
        Boolean(workspace.keywords?.some((keyword) => includeKeywords.includes(keyword)));

      return { ...workspace, selected: isIncluded };
    }),
  );

  if (withDependencies) {
    result = result.map((workspace) => {
      return workspace.selected
        ? workspace
        : {
            ...workspace,
            selected: getWorkspaceLocalDependencies(workspace, result).some((dependency) => dependency.selected),
          };
    });
  }

  return result;
};

export const isWorkspaceMatch = (
  workspace: Pick<WorkspacePartialOptions, 'name' | 'dir'>,
  rootDir: string,
  nameOrPath: string,
): boolean => {
  return (
    nameOrPath === workspace.name ||
    ((nameOrPath.startsWith('.') || isAbsolute(nameOrPath)) && resolve(rootDir, nameOrPath) === workspace.dir)
  );
};

export const getWorkspaces = async ({
  workspacePackages,
  rootDir,
  commandName,
  ...options
}: WorkspacesOptions): Promise<readonly WorkspacePartialOptions[]> => {
  const sorted = getSorted(workspacePackages);
  const selected = await getSelected(sorted, rootDir, options);
  const result: WorkspacePartialOptions[] = selected.map(
    ({
      private: private_ = false,
      dependencies = {},
      peerDependencies = {},
      optionalDependencies = {},
      devDependencies = {},
      keywords = [],
      werk = {},
      ...workspace
    }) => ({
      private: private_,
      dependencies,
      peerDependencies,
      optionalDependencies,
      devDependencies,
      keywords,
      config: werk[commandName]?.config,
      ...workspace,
    }),
  );

  return result;
};
