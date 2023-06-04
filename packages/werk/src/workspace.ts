import { join } from 'node:path';

import { type PackageJson } from 'type-fest';

import { type Patch, readJsonFile, writeJsonFile } from './utils/json.js';
import { getKeys } from './utils/object.js';

interface WorkspaceFilters {
  readonly workspace?: readonly string[];
  readonly keyword?: readonly string[];
  readonly notKeyword?: readonly string[];
  readonly private?: boolean;
  readonly public?: boolean;
}

export interface WorkspaceOptions {
  readonly dir: string;
  readonly name: string;
  readonly version: string;
  readonly private?: boolean;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly keywords?: readonly string[];
  readonly selected?: boolean;
}

export const getWorkspaceDependencyNames = (
  workspace: Pick<WorkspaceOptions, 'dependencies' | 'peerDependencies' | 'optionalDependencies' | 'devDependencies'>,
): ReadonlySet<string> => {
  return getKeys(
    workspace.dependencies,
    workspace.peerDependencies,
    workspace.optionalDependencies,
    workspace.devDependencies,
  );
};

export const getAlphabeticalWorkspaces = (
  workspaces: readonly WorkspaceOptions[],
): ReadonlyMap<string, WorkspaceOptions> => {
  return new Map(
    [...workspaces].sort((a, b) => a.name.localeCompare(b.name)).map((workspace) => [workspace.name, workspace]),
  );
};

export const getDependencyOrderedWorkspaces = (
  workspaces: readonly WorkspaceOptions[],
): ReadonlyMap<string, WorkspaceOptions> => {
  const alphabetical = new Map(getAlphabeticalWorkspaces(workspaces));
  const names = new Set(alphabetical.keys());
  const ordered = new Map<string, WorkspaceOptions>();

  while (alphabetical.size) {
    const workspace = [...alphabetical.values()].find((props) => {
      return [...getWorkspaceDependencyNames(props)]
        .filter((name) => names.has(name))
        .every((name) => ordered.has(name));
    });

    if (!workspace) {
      throw new Error('circular dependencies detected');
    }

    ordered.set(workspace.name, workspace);
    alphabetical.delete(workspace.name);
  }

  return ordered;
};

export const isWorkspaceSelected = (workspace: WorkspaceOptions, filters: WorkspaceFilters): boolean => {
  const isExcluded =
    Boolean(workspace.keywords?.some((keyword) => filters.notKeyword?.includes(keyword))) ||
    (workspace.private ? filters.private === false : filters.public === false);

  const isIncluded =
    !isExcluded &&
    ((!filters.workspace?.length && !filters.keyword?.length) ||
      Boolean(filters.workspace?.includes(workspace.name)) ||
      Boolean(workspace.keywords?.some((keyword) => filters.keyword?.includes(keyword))));

  return isIncluded;
};

export class Workspace implements WorkspaceOptions {
  readonly dir: string;
  readonly name: string;
  readonly version: string;
  readonly private: boolean;
  readonly dependencies: Readonly<Record<string, string>>;
  readonly peerDependencies: Readonly<Record<string, string>>;
  readonly optionalDependencies: Readonly<Record<string, string>>;
  readonly devDependencies: Readonly<Record<string, string>>;
  readonly keywords: readonly string[];
  readonly selected: boolean;
  readonly dependencyNames: ReadonlySet<string>;

  constructor(options: WorkspaceOptions) {
    this.dir = options.dir;
    this.name = options.name;
    this.version = options.version;
    this.private = options.private ?? false;
    this.dependencies = options.dependencies ?? {};
    this.peerDependencies = options.peerDependencies ?? {};
    this.optionalDependencies = options.optionalDependencies ?? {};
    this.devDependencies = options.devDependencies ?? {};
    this.keywords = options.keywords ?? [];
    this.selected = options.selected ?? false;
    this.dependencyNames = getWorkspaceDependencyNames(this);
  }

  readonly readPackageJson = async (): Promise<PackageJson> => {
    return await readJsonFile(join(this.dir, 'package.json'));
  };

  readonly writePackageJson = async (patch: Patch<PackageJson>): Promise<boolean> => {
    const [merged, modified] = await writeJsonFile(join(this.dir, 'package.json'), patch);
    if (merged.version !== this.version) Object.assign(this, { version: merged.version });
    return modified;
  };
}
