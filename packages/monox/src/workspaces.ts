import fs from 'node:fs/promises';

import { type PackageJson } from 'type-fest';

import { getNpmWorkspaces } from './npm.js';

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const merge = (a: unknown, b: unknown): unknown => {
  if (typeof b === 'undefined') return a;
  if (!isObject(b) || !isObject(a)) return b;

  let result = a;

  for (const [key, patch] of Object.entries(b)) {
    const base = result[key];
    const merged = merge(base, patch);

    if (merged !== base) {
      result = { ...result, [key]: merged };
    }
  }

  return result;
};

export interface WorkspaceFilters {
  readonly workspace?: readonly string[];
  readonly keyword?: readonly string[];
  readonly notKeyword?: readonly string[];
  readonly private: boolean;
  readonly public: boolean;
}

export interface WorkspaceProps {
  readonly name: string;
  readonly version: string;
  readonly private: boolean;
  readonly dependencies: Record<string, string>;
  readonly peerDependencies: Record<string, string>;
  readonly optionalDependencies: Record<string, string>;
  readonly devDependencies: Record<string, string>;
  readonly keywords: string[];
  readonly path: string;
  readonly selected: boolean;
}

export class Workspace implements WorkspaceProps {
  readonly name: string;
  readonly version: string;
  readonly private: boolean;
  readonly dependencies: Record<string, string>;
  readonly peerDependencies: Record<string, string>;
  readonly optionalDependencies: Record<string, string>;
  readonly devDependencies: Record<string, string>;
  readonly keywords: string[];
  readonly path: string;
  readonly selected: boolean;
  readonly dependencyNames: ReadonlySet<string>;

  constructor(workspace: WorkspaceProps) {
    ({
      name: this.name,
      version: this.version,
      private: this.private,
      dependencies: this.dependencies,
      peerDependencies: this.peerDependencies,
      optionalDependencies: this.optionalDependencies,
      devDependencies: this.devDependencies,
      keywords: this.keywords,
      path: this.path,
      selected: this.selected,
    } = workspace);

    this.dependencyNames = new Set(
      Object.keys({
        ...this.dependencies,
        ...this.peerDependencies,
        ...this.optionalDependencies,
        ...this.devDependencies,
      }),
    );
  }

  async readPackageJson(): Promise<PackageJson> {
    return await fs.readFile(`${this.path}/package.json`, 'utf-8').then((value) => JSON.parse(value));
  }

  async writePackageJson(patch: Record<string, unknown>): Promise<boolean> {
    const base = await this.readPackageJson();
    const merged = merge(base, patch) as PackageJson;

    if (merged === base) return false;

    await fs.writeFile(`${this.path}/package.json`, JSON.stringify(merged, null, 2) + '\n');

    if (merged.version !== this.version) Object.assign(this, { version: merged.version });

    return true;
  }
}

export interface GetWorkspacesOptions {
  alphabetical?: boolean;
  filters: WorkspaceFilters;
}

export const getWorkspaces = async ({
  alphabetical: alphabetical_ = false,
  filters,
}: GetWorkspacesOptions): Promise<ReadonlyMap<string, Workspace>> => {
  const raw = await getNpmWorkspaces();
  const names = new Set(raw.map(({ name }) => name));
  const alphabetical = new Map(
    await Promise.all(
      raw
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(async ({ name, private: private_ = false, keywords = [], path, realpath = path, ...workspace }) => {
          const dependencies = Object.fromEntries(
            Object.entries(workspace.dependencies ?? {}).filter(([key]) => names.has(key)),
          );
          const peerDependencies = Object.fromEntries(
            Object.entries(workspace.peerDependencies ?? {}).filter(([key]) => names.has(key)),
          );
          const optionalDependencies = Object.fromEntries(
            Object.entries(workspace.optionalDependencies ?? {}).filter(([key]) => names.has(key)),
          );
          const devDependencies = Object.fromEntries(
            Object.entries(workspace.devDependencies ?? {}).filter(([key]) => names.has(key)),
          );

          const isEverythingIncluded = !filters.workspace?.length && !filters.keyword?.length;
          const isWorkspaceIncluded = Boolean(filters.workspace?.includes(name));
          const isKeywordIncluded = keywords.some((keyword) => filters.keyword?.includes(keyword));
          const isKeywordExcluded = keywords.some((keyword) => filters.notKeyword?.includes(keyword));
          const isVisibilityExcluded = private_ ? !filters.private : !filters.public;

          return [
            name,
            new Workspace({
              ...workspace,
              name,
              private: private_,
              dependencies,
              peerDependencies,
              optionalDependencies,
              devDependencies,
              keywords,
              path: realpath,
              selected:
                (isEverythingIncluded || isWorkspaceIncluded || isKeywordIncluded) &&
                !isKeywordExcluded &&
                !isVisibilityExcluded,
            }),
          ] as const;
        }),
    ),
  );

  if (alphabetical_) return alphabetical;

  const ordered = new Map<string, Workspace>();

  while (alphabetical.size) {
    const workspace = Array.from(alphabetical.values()).find(({ dependencyNames }) =>
      [...dependencyNames].every((name) => ordered.has(name)),
    );

    if (!workspace) {
      throw new Error('circular dependencies detected');
    }

    ordered.set(workspace.name, workspace);
    alphabetical.delete(workspace.name);
  }

  return ordered;
};
