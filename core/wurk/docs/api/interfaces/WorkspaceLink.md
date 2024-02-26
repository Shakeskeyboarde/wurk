[Wurk API](../README.md) / WorkspaceLink

# Interface: WorkspaceLink

Represents an edge in the workspace dependency graph.

## Table of contents

### Properties

- [dependency](WorkspaceLink.md#dependency)
- [dependent](WorkspaceLink.md#dependent)
- [id](WorkspaceLink.md#id)
- [type](WorkspaceLink.md#type)
- [versionRange](WorkspaceLink.md#versionrange)

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

___

### type

• `Readonly` **type**: ``"dependencies"`` \| ``"devDependencies"`` \| ``"peerDependencies"`` \| ``"optionalDependencies"``

The type of the dependency in the dependent workspace's `package.json`
file (eg. `devDependencies`).

___

### versionRange

• `Readonly` **versionRange**: `string`

Version range of the dependency in the dependent workspace's
`package.json` file.
