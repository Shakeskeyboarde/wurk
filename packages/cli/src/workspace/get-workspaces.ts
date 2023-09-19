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
  readonly rootPackage: WorkspacePackage;
  readonly workspacePackages: readonly WorkspacePackage[];
  readonly commandName: string;
}

const getSorted = (workspaces: readonly WorkspacePartialOptions[]): readonly WorkspacePartialOptions[] => {
  const unresolved = new Map(workspaces.map((workspace) => [workspace.name, workspace]));
  const localNames = new Set(unresolved.keys());
  const resolvedNames = new Set<string>();
  const result: WorkspacePartialOptions[] = [];

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

const select = async (
  workspaces: readonly WorkspacePartialOptions[],
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
  }: Omit<SelectOptions, 'includeRoot'> & GitOptions,
): Promise<void> => {
  const getIsPublished = async (name: string, version: string): Promise<boolean> => {
    return await getNpmMetadata(name, version).then((meta) => meta?.version === version);
  };

  const getIsModified = memoize(getWorkspaceIsModified, (...args) => JSON.stringify(args));

  await Promise.all(
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
        return;
      }

      const isIncluded =
        (!includeWorkspaces.length && !includeKeywords.length) ||
        includeWorkspaces.some((nameOrPath) => isWorkspaceMatch(workspace, rootDir, nameOrPath)) ||
        Boolean(workspace.keywords?.some((keyword) => includeKeywords.includes(keyword)));

      if (isIncluded) {
        Object.assign(workspace, { selected: true });
      }
    }),
  );

  if (withDependencies) {
    workspaces.forEach((workspace) => {
      if (workspace.selected) {
        getWorkspaceLocalDependencies(workspace, workspaces).forEach((dependency) => {
          Object.assign(dependency, { selected: true });
        });
      }
    });
  }
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

export const getWorkspace = (
  {
    private: private_ = false,
    type = 'commonjs',
    types,
    bin = {},
    main,
    module,
    exports = {},
    directories = {},
    man = [],
    dependencies = {},
    peerDependencies = {},
    optionalDependencies = {},
    devDependencies = {},
    keywords = [],
    werk = {},
    scripts = {},
    ...workspace
  }: WorkspacePackage,
  commandName: string,
): WorkspacePartialOptions => {
  return {
    selected: false,
    private: private_,
    type,
    types,
    bin,
    main,
    module,
    exports,
    directories,
    man,
    dependencies,
    peerDependencies,
    optionalDependencies,
    devDependencies,
    keywords,
    scripts,
    config: werk[commandName]?.config,
    ...workspace,
  };
};

export const getWorkspaces = async ({
  rootPackage,
  workspacePackages,
  commandName,
  includeRoot,
  ...options
}: WorkspacesOptions): Promise<
  [root: WorkspacePartialOptions, workspaces: readonly WorkspacePartialOptions[], isMonorepo: boolean]
> => {
  const isMonorepo = workspacePackages.length > 0 || 'workspaces' in rootPackage;
  const isRootIncluded = includeRoot || !isMonorepo;
  const root = getWorkspace(rootPackage, commandName);
  const others = workspacePackages.map((workspace) => getWorkspace(workspace, commandName));
  const workspaces = getSorted(isRootIncluded ? [root, ...others] : others);

  await select(workspaces, rootPackage.dir, options);

  return [root, workspaces, isMonorepo];
};
