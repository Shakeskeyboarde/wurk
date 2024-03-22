[Wurk API](../README.md) / WorkspaceDependency

# Interface: WorkspaceDependency

A dependency in a workspace's `package.json` file.

## Hierarchy

- **`WorkspaceDependency`**

  ↳ [`WorkspaceLink`](WorkspaceLink.md)

## Table of contents

### Properties

- [id](WorkspaceDependency.md#id)
- [spec](WorkspaceDependency.md#spec)
- [type](WorkspaceDependency.md#type)

## Properties

### id

• `Readonly` **id**: `string`

The key of the dependency in the dependent workspace's `package.json`
file. This may not be the same as the dependency's package name if the
entry is an alias.

___

### spec

• `Readonly` **spec**: [`WorkspaceDependencySpec`](../README.md#workspacedependencyspec)

The dependency spec.

___

### type

• `Readonly` **type**: ``"dependencies"`` \| ``"devDependencies"`` \| ``"peerDependencies"`` \| ``"optionalDependencies"``

The type of the dependency in the dependent workspace's `package.json`
file (eg. `devDependencies`).
