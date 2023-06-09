import { getNpmMetadata } from '../npm/get-npm-metadata.js';
import { memoize } from '../utils/memoize.js';
import { getWorkspaceIsModified } from './get-workspace-is-modified.js';
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
  const getIsPublished = async (name: string, version: string): Promise<boolean> => {
    return Boolean(await getNpmMetadata(name, version));
  };

  const getIsModified = memoize(async (dir: string, name: string, version: string): Promise<boolean> => {
    const meta = await getNpmMetadata(name, version);
    return await getWorkspaceIsModified(dir, meta?.gitHead);
  });

  workspaces = await Promise.all(
    Array.from(workspaces).map(async (workspace) => {
      let isExcluded =
        workspace.selected === false ||
        excludeWorkspaces.includes(workspace.name) ||
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
        isExcluded = await getIsModified(workspace.dir, workspace.name, workspace.version);
      }

      if (!isExcluded && excludeUnmodified) {
        isExcluded = !(await getIsModified(workspace.dir, workspace.name, workspace.version));
      }

      if (isExcluded) {
        return { ...workspace, selected: false };
      }

      const isIncluded =
        workspace.selected ||
        (!includeWorkspaces.length && !includeKeywords.length) ||
        includeWorkspaces.includes(workspace.name) ||
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
