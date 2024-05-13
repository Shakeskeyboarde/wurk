[**Wurk API**](../README.md) • **Docs**

***

[Wurk API](../README.md) / WorkspaceLink

# Interface: WorkspaceLink

Represents an edge in the workspace dependency graph.

## Extends

- [`WorkspaceDependency`](WorkspaceDependency.md)

## Properties

### dependency

> `readonly` **dependency**: [`Workspace`](../classes/Workspace.md)

The dependency workspace.

***

### dependent

> `readonly` **dependent**: [`Workspace`](../classes/Workspace.md)

The dependent workspace.

***

### id

> `readonly` **id**: `string`

The key of the dependency in the dependent workspace's `package.json`
file. This may not be the same as the dependency's package name if the
entry is an alias.

#### Inherited from

[`WorkspaceDependency`](WorkspaceDependency.md).[`id`](WorkspaceDependency.md#id)

***

### spec

> `readonly` **spec**: [`WorkspaceDependencySpec`](../type-aliases/WorkspaceDependencySpec.md)

The dependency spec.

#### Inherited from

[`WorkspaceDependency`](WorkspaceDependency.md).[`spec`](WorkspaceDependency.md#spec)

***

### type

> `readonly` **type**: `"dependencies"` \| `"devDependencies"` \| `"peerDependencies"` \| `"optionalDependencies"`

The type of the dependency in the dependent workspace's `package.json`
file (eg. `devDependencies`).

#### Inherited from

[`WorkspaceDependency`](WorkspaceDependency.md).[`type`](WorkspaceDependency.md#type)
