import { type WorkspaceDependency } from './dependency.js';
import { getDepthFirstGenerator } from './generator.js';
import { type Workspace } from './workspace.js';

/**
 * A collection of workspace links representing the dependency graph of a
 * collection of workspaces.
 */
export interface WorkspaceLinks {
  /**
   * Get the links from a dependent workspace to its dependencies.
   */
  readonly getLinksFromDependentToDependencies: (
    dependent: Workspace,
    options?: WorkspaceLinkOptions
  ) => readonly WorkspaceLink[];

  /**
   * Get the links from a dependency workspace to its dependents.
   */
  readonly getLinksFromDependencyToDependents: (
    dependency: Workspace,
    options?: WorkspaceLinkOptions
  ) => readonly WorkspaceLink[];
}

/**
 * Represents an edge in the workspace dependency graph.
 */
export interface WorkspaceLink extends WorkspaceDependency {
  /**
   * The dependent workspace.
   */
  readonly dependent: Workspace;

  /**
   * The dependency workspace.
   */
  readonly dependency: Workspace;
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

/**
 * Create the workspace links (ie. the dependency graph) for a collection of
 * workspaces.
 */
export const getLinks = (workspaces: readonly Workspace[]): WorkspaceLinks => {
  const linksFromDependentToDependencies = new Map<Workspace, WorkspaceLink[]>();
  const linksFromDependencyToDependents = (new Map<Workspace, WorkspaceLink[]>());

  workspaces
    .flatMap((dependent) => {
      return dependent.dependencies.map((dependency) => [dependent, dependency] as const);
    })
    .flatMap(([dependent, { id, spec, type }]) => {
      // const spec = getDependencySpec(id, specString);
      const name = 'name' in spec ? spec.name : id;

      return workspaces
        .filter((workspace) => workspace.name === name)
        .map((dependency) => ({ dependent, dependency, type, id, spec }));
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
