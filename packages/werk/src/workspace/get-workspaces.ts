import { isAbsolute, resolve } from 'node:path';

import { getNpmMetadata } from '../npm/get-npm-metadata.js';
import { type GitOptions, type SelectOptions } from '../options.js';
import { memoize } from '../utils/memoize.js';
import { getWorkspaceDependencyNames } from './get-workspace-dependency-names.js';
import { getWorkspaceIsModified } from './get-workspace-is-modified.js';
import { getWorkspaceLocalDependencies } from './get-workspace-local-dependencies.js';
import { type WorkspaceOptions } from './workspace.js';

const getSorted = (workspaces: readonly WorkspaceOptions[]): readonly WorkspaceOptions[] => {
  const unresolved = new Map(workspaces.map((workspace) => [workspace.name, workspace]));
  const localNames = new Set(unresolved.keys());
  const resolvedNames = new Set<string>();
  const result: WorkspaceOptions[] = [];

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
  workspaces: readonly WorkspaceOptions[],
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
): Promise<readonly WorkspaceOptions[]> => {
  const getIsPublished = async (name: string, version: string): Promise<boolean> => {
    return Boolean(await getNpmMetadata(name, version));
  };

  const getIsModified = memoize(getWorkspaceIsModified, (...args) => JSON.stringify(args));

  workspaces = await Promise.all(
    Array.from(workspaces).map(async (workspace) => {
      let isExcluded =
        workspace.selected === false ||
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
        workspace.selected ||
        (!includeWorkspaces.length && !includeKeywords.length) ||
        includeWorkspaces.some((nameOrPath) => isWorkspaceMatch(workspace, rootDir, nameOrPath)) ||
        Boolean(workspace.keywords?.some((keyword) => includeKeywords.includes(keyword)));

      return { ...workspace, selected: isIncluded };
    }),
  );

  if (withDependencies) {
    workspaces = workspaces.map((workspace) => {
      return workspace.selected
        ? workspace
        : {
            ...workspace,
            selected: getWorkspaceLocalDependencies(workspace, workspaces).some((dependency) => dependency.selected),
          };
    });
  }

  return workspaces;
};

export const isWorkspaceMatch = (
  workspace: Pick<WorkspaceOptions, 'name' | 'dir'>,
  rootDir: string,
  nameOrPath: string,
): boolean => {
  return (
    nameOrPath === workspace.name ||
    ((nameOrPath.startsWith('.') || isAbsolute(nameOrPath)) && resolve(rootDir, nameOrPath) === workspace.dir)
  );
};

export const getWorkspaces = async (
  workspaces: readonly WorkspaceOptions[],
  rootDir: string,
  options: SelectOptions & GitOptions,
): Promise<readonly WorkspaceOptions[]> => {
  workspaces = getSorted(workspaces);
  workspaces = await getSelected(workspaces, rootDir, options);

  return workspaces;
};
