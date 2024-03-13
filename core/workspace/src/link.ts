import { getDepthFirstGenerator } from './generator.js';
import { type DependencySpec, getSpec } from './spec.js';
import { type Workspace } from './workspace.js';

export interface WorkspaceLinks {
  readonly getLinksFromDependentToDependencies: (
    dependent: Workspace,
    options?: WorkspaceLinkOptions
  ) => readonly WorkspaceLink[];

  readonly getLinksFromDependencyToDependents: (
    dependency: Workspace,
    options?: WorkspaceLinkOptions
  ) => readonly WorkspaceLink[];
}

/**
 * Represents an edge in the workspace dependency graph.
 */
export interface WorkspaceLink {
  /**
   * The dependent workspace.
   */
  readonly dependent: Workspace;

  /**
   * The dependency workspace.
   */
  readonly dependency: Workspace;

  /**
   * The type of the dependency in the dependent workspace's `package.json`
   * file (eg. `devDependencies`).
   */
  readonly type: (typeof WORKSPACE_LINK_SCOPES)[number];

  /**
   * The key of the dependency in the dependent workspace's `package.json`
   * file. This may not be the same as the dependency's package name if the
   * entry is an alias.
   */
  readonly id: string;

  /**
   * The dependency spec.
   */
  readonly spec: DependencySpec;
}

/**
 * Options for filtering workspace links.
 */
export interface WorkspaceLinkOptions {
  /**
   * If true, include transitive links.
   */
  readonly recursive?: boolean;

  /**
   * If provided, filter the links. If a link is filtered, it will also stop
   * recursion from traversing the filtered link's transitive links.
   */
  readonly filter?: (link: WorkspaceLink) => boolean;
}

export const getLinks = (workspaces: readonly Workspace[]): WorkspaceLinks => {
  const linksFromDependentToDependencies = new Map<Workspace, WorkspaceLink[]>();
  const linksFromDependencyToDependents = (new Map<Workspace, WorkspaceLink[]>());

  workspaces
    .flatMap((dependent) => {
      return [
        [dependent, 'devDependencies'],
        [dependent, 'dependencies'],
        [dependent, 'peerDependencies'],
        [dependent, 'optionalDependencies'],
      ] as const;
    })
    .flatMap(([dependent, type]) => {
      return dependent.config
        .at(type)
        .entries('object')
        .map(([id, specString]) => ({ dependent, type, id, specString }))
        .filter((entry): entry is typeof entry & { specString: string } => {
          return typeof entry.specString === 'string';
        });
    })
    .flatMap(({ dependent, type, id, specString }) => {
      const spec = getSpec(id, specString);
      const name = spec.type === 'npm' ? spec.name : id;

      return workspaces
        .filter((workspace) => workspace.name === name)
        .map((dependency) => ({
          dependent,
          dependency,
          type,
          id,
          spec: { ...spec },
        }));
    })
    .forEach(({ dependent, dependency, type, id, spec }) => {
      linksFromDependentToDependencies.set(dependent, [
        ...(linksFromDependentToDependencies.get(dependent) ?? []),
        { dependent, dependency, type, id, spec },
      ]);
      linksFromDependencyToDependents.set(dependency, [
        ...(linksFromDependencyToDependents.get(dependency) ?? []),
        { dependent, dependency, type, id, spec },
      ]);
    });

  linksFromDependentToDependencies.forEach((links) => {
    return links.sort((a, b) => {
      return a.dependency.name.localeCompare(b.dependency.name);
    });
  });

  linksFromDependencyToDependents.forEach((links) => {
    return links.sort((a, b) => {
      return a.dependent.name.localeCompare(b.dependent.name);
    });
  });

  const getLinksFromDependentToDependencies = (
    dependent: Workspace,
    options?: WorkspaceLinkOptions,
  ): readonly WorkspaceLink[] => {
    let links = linksFromDependentToDependencies.get(dependent) ?? [];

    if (options?.recursive) {
      links = Array.from(getDepthFirstGenerator(
        links,
        ({ dependency: nextDependent }) => linksFromDependentToDependencies.get(nextDependent),
        options?.filter,
      ));
    }

    return links;
  };

  const getLinksFromDependencyToDependents = (
    dependency: Workspace,
    options?: WorkspaceLinkOptions,
  ): readonly WorkspaceLink[] => {
    let links = linksFromDependencyToDependents.get(dependency) ?? [];

    if (options?.recursive) {
      links = Array.from(getDepthFirstGenerator(
        links,
        ({ dependent: nextDependency }) => linksFromDependencyToDependents.get(nextDependency),
        options?.filter,
      ));
    }

    return links;
  };

  return { getLinksFromDependentToDependencies, getLinksFromDependencyToDependents };
};

const WORKSPACE_LINK_SCOPES = [
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
  'dependencies',
] as const;
