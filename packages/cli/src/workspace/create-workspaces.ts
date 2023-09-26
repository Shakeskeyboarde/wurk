import { EnhancedMap, type ReadonlyEnhancedMap } from '../utils/enhanced-map.js';
import { type PackageJsonKnown } from '../utils/package-json.js';
import { Workspace, WorkspaceDependencyScope, type WorkspaceReference } from './workspace.js';

export interface RawWorkspace extends Omit<PackageJsonKnown, 'private'> {
  readonly name: string;
  readonly dir: string;
  readonly isPrivate: boolean | undefined;
}

interface Node {
  readonly workspace: Workspace;
  readonly localDependencies: EnhancedMap<string, WorkspaceReference>;
  readonly localDependents: EnhancedMap<string, WorkspaceReference>;
}

interface Edge {
  node: Node;
  scope: WorkspaceDependencyScope;
}

interface Options {
  readonly rawRootWorkspace: RawWorkspace;
  readonly rawWorkspaces: readonly RawWorkspace[];
  readonly includeRootWorkspace: boolean;
  readonly gitHead: string | undefined;
  readonly gitFromRevision: string | undefined;
}

const createNode = (
  {
    name,
    description,
    version,
    scripts,
    keywords,
    type,
    files,
    directories,
    man,
    types,
    bin,
    main,
    module,
    exports,
    dependencies,
    peerDependencies,
    optionalDependencies,
    devDependencies,
    dir,
    isPrivate,
  }: RawWorkspace,
  isRoot: boolean,
  gitHead: string | undefined,
  gitFromRevision: string | undefined,
): Node => {
  const localDependencies = new EnhancedMap<string, WorkspaceReference>();
  const localDependents = new EnhancedMap<string, WorkspaceReference>();
  const workspace = new Workspace({
    name,
    description,
    version,
    scripts,
    keywords,
    type,
    files,
    directories,
    man,
    types,
    bin,
    main,
    module,
    exports,
    dependencies,
    peerDependencies,
    optionalDependencies,
    devDependencies,
    dir,
    isPrivate,
    isRoot,
    isSelected: false,
    gitHead,
    gitFromRevision,
    localDependencies,
    localDependents,
  });

  return { workspace, localDependencies, localDependents };
};

export const createWorkspaces = ({
  rawRootWorkspace,
  rawWorkspaces,
  includeRootWorkspace,
  gitHead,
  gitFromRevision,
}: Options): [root: Workspace, workspaces: ReadonlyEnhancedMap<string, Workspace>] => {
  // Create graph nodes.

  const rootNode = createNode(rawRootWorkspace, true, gitHead, gitFromRevision);
  const nodes = new EnhancedMap<string, Node>(
    rawWorkspaces.map((rawWorkspace) => [rawWorkspace.name, createNode(rawWorkspace, false, gitHead, gitFromRevision)]),
  );

  if (includeRootWorkspace) {
    nodes.set(rootNode.workspace.name, rootNode);
  }

  // Create graph edges.

  const edges = {
    localDependencies: new Map<string, Edge[]>(),
    localDependents: new Map<string, Edge[]>(),
  } as const;

  nodes.forEach((node) => {
    (
      [
        [WorkspaceDependencyScope.prod, 'dependencies'],
        [WorkspaceDependencyScope.peer, 'peerDependencies'],
        [WorkspaceDependencyScope.optional, 'optionalDependencies'],
        [WorkspaceDependencyScope.dev, 'devDependencies'],
      ] as const
    ).forEach(([scope, field]) => {
      Object.keys(node.workspace[field]).forEach((id) => {
        const dependency = nodes.get(id);

        if (!dependency) return;

        edges.localDependencies.set(node.workspace.name, [
          ...(edges.localDependencies.get(id) ?? []),
          { node: dependency, scope },
        ]);
        edges.localDependents.set(dependency.workspace.name, [
          ...(edges.localDependents.get(dependency.workspace.name) ?? []),
          { node, scope },
        ]);
      });
    });
  });

  // Walk the edges to populate the local dependencies and dependents.

  const addLocals = (type: 'localDependencies' | 'localDependents', root: Node): void => {
    const visited: string[] = [];
    const next = (child: Node, rootScope: WorkspaceDependencyScope): void => {
      if (root.workspace.name === child.workspace.name) {
        throw new Error(
          `Circular dependencies detected.\n  ${root.workspace.name}${visited.map((name) => `\n  -> ${name}`)}\n  -> ${
            child.workspace.name
          } (loop)`,
        );
      }

      visited.push(child.workspace.name);

      try {
        const isDirect = visited.length === 1;

        if (!isDirect && rootScope === WorkspaceDependencyScope.dev) return;

        const existing = root[type].get(child.workspace.name);

        root[type].set(child.workspace.name, {
          workspace: child.workspace,
          scope: rootScope,
          isDirect,
        });

        // Already added with an equal or greater scope.
        if (existing && existing.scope >= rootScope) return;

        edges[type].get(child.workspace.name)?.forEach((edge) => next(edge.node, rootScope));
      } finally {
        visited.pop();
      }
    };

    edges[type].get(root.workspace.name)?.forEach(({ node, scope }) => next(node, scope));
  };

  nodes.forEach((node) => {
    addLocals('localDependencies', node);
    addLocals('localDependents', node);
  });

  // Build ordered map of workspaces based on local interdependency.

  const ordered = new EnhancedMap<string, Workspace>();

  while (nodes.size) {
    /*
     * Find all remaining nodes that have no un-ordered direct
     * dependencies. This could find one node at a time instead of in
     * batches, which would stay closer to the original order, but it
     * would also result in less concurrency when running in parallel
     * mode.
     */
    const unblocked = Array.from(nodes.values()).filter(({ localDependencies }) => {
      return Array.from(localDependencies.values()).every(
        (dependency) => !dependency.isDirect || ordered.has(dependency.workspace.name),
      );
    });

    /*
     * Shouldn't happen because loops should have been detected when
     * traversing the graph above.
     */
    if (!unblocked.length) {
      throw new Error('Circular dependencies detected.');
    }

    unblocked.forEach(({ workspace }) => {
      nodes.delete(workspace.name);
      ordered.set(workspace.name, workspace);
    });
  }

  return [rootNode.workspace, ordered];
};
