import memoize from 'lodash.memoize';

import { getIsGitModified } from '../git/get-is-git-modified.js';
import { getNpmMetadata } from '../npm/get-npm-metadata.js';
import { getWorkspaceLocalDependencies } from './get-workspace-local-dependencies.js';
import { type WorkspaceOptions } from './workspace.js';

export interface SelectOptions {
  readonly withDependencies: boolean;
  readonly includeWorkspaces: readonly string[];
  readonly includeKeywords: readonly string[];
  readonly excludeWorkspaces: readonly string[];
  readonly excludeKeywords: readonly string[];
  readonly excludePrivate: boolean;
  readonly excludePublic: boolean;
  readonly excludePublished: boolean;
  readonly excludeUnpublished: boolean;
  readonly excludeModified: boolean;
  readonly excludeUnmodified: boolean;
}

const getCachedNpmMetadata = memoize(getNpmMetadata, (name, version) => `${name}@${version}`);
const getCachedIsGitModified = memoize(getIsGitModified, (dir, commit) => JSON.stringify([dir, commit]));

const getSorted = (workspaces: readonly WorkspaceOptions[]): readonly WorkspaceOptions[] => {
  const unresolved = new Map(workspaces.map((workspace) => [workspace.name, workspace]));
  const localNames = new Set(unresolved.keys());
  const resolvedNames = new Set<string>();
  const result: WorkspaceOptions[] = [];

  while (unresolved.size) {
    let count = 0;

    unresolved.forEach((workspace) => {
      const isBlocked = getWorkspaceLocalDependencies(workspace, workspaces).some(
        ({ name }) => localNames.has(name) && !resolvedNames.has(name),
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

const getSelected = async (
  workspaces: readonly WorkspaceOptions[],
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
  }: SelectOptions,
): Promise<readonly WorkspaceOptions[]> => {
  workspaces = await Promise.all(
    Array.from(workspaces).map(async (workspace) => {
      let isExcluded =
        workspace.selected === false ||
        excludeWorkspaces.includes(workspace.name) ||
        Boolean(workspace.keywords?.some((keyword) => excludeKeywords.includes(keyword))) ||
        (excludePrivate && workspace.private) ||
        (excludePublic && !workspace.private);

      if (!isExcluded && excludePublished) {
        isExcluded = await getCachedNpmMetadata(workspace.name, workspace.version).then(Boolean);
      }

      if (isExcluded && excludeUnpublished) {
        isExcluded = await getCachedNpmMetadata(workspace.name, workspace.version).then((meta) => !meta);
      }

      if (!isExcluded && excludeModified) {
        const commit = await getCachedNpmMetadata(workspace.name, workspace.version).then((meta) => meta?.gitHead);
        isExcluded = !!commit && (await getCachedIsGitModified(workspace.dir, commit));
      }

      if (!isExcluded && excludeUnmodified) {
        const commit = await getCachedNpmMetadata(workspace.name, workspace.version).then((meta) => meta?.gitHead);
        isExcluded = !commit || !(await getCachedIsGitModified(workspace.dir, commit));
      }

      if (isExcluded) {
        return { ...workspace, selected: false };
      }

      const isIncluded =
        workspace.selected ||
        (!includeWorkspaces.length && !includeKeywords.length) ||
        Boolean(workspace.name != null && includeWorkspaces.includes(workspace.name)) ||
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

export const getWorkspaces = async (
  workspaces: readonly WorkspaceOptions[],
  options: SelectOptions,
): Promise<readonly WorkspaceOptions[]> => {
  workspaces = getSorted(workspaces);
  workspaces = await getSelected(workspaces, options);

  return workspaces;
};
