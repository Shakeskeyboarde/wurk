[Wurk API](../README.md) / WorkspaceLink

# Interface: WorkspaceLink

Represents an edge in the workspace dependency graph.

## Hierarchy

- [`WorkspaceDependency`](WorkspaceDependency.md)

  ↳ **`WorkspaceLink`**

## Table of contents

### Properties

- [dependency](WorkspaceLink.md#dependency)
- [dependent](WorkspaceLink.md#dependent)
- [id](WorkspaceLink.md#id)
- [spec](WorkspaceLink.md#spec)
- [type](WorkspaceLink.md#type)

## Properties

### dependency

• `Readonly` **dependency**: [`Workspace`](../classes/Workspace.md)

The dependency workspace.

___

### dependent

• `Readonly` **dependent**: [`Workspace`](../classes/Workspace.md)

The dependent workspace.

___

### id

• `Readonly` **id**: `string`

The key of the dependency in the dependent workspace's `package.json`
file. This may not be the same as the dependency's package name if the
entry is an alias.

#### Inherited from

[WorkspaceDependency](WorkspaceDependency.md).[id](WorkspaceDependency.md#id)

___

### spec

• `Readonly` **spec**: [`WorkspaceDependencySpec`](../README.md#workspacedependencyspec)

The dependency spec.

#### Inherited from

[WorkspaceDependency](WorkspaceDependency.md).[spec](WorkspaceDependency.md#spec)

___

### type

• `Readonly` **type**: ``"dependencies"`` \| ``"devDependencies"`` \| ``"peerDependencies"`` \| ``"optionalDependencies"``

The type of the dependency in the dependent workspace's `package.json`
file (eg. `devDependencies`).

#### Inherited from

[WorkspaceDependency](WorkspaceDependency.md).[type](WorkspaceDependency.md#type)
