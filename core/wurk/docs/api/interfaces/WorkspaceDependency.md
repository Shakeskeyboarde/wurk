[**Wurk API**](../README.md) • **Docs**

***

[Wurk API](../README.md) / WorkspaceDependency

# Interface: WorkspaceDependency

A dependency in a workspace's `package.json` file.

## Extended by

- [`WorkspaceLink`](WorkspaceLink.md)

## Properties

### id

> `readonly` **id**: `string`

The key of the dependency in the dependent workspace's `package.json`
file. This may not be the same as the dependency's package name if the
entry is an alias.

***

### spec

> `readonly` **spec**: [`WorkspaceDependencySpec`](../type-aliases/WorkspaceDependencySpec.md)

The dependency spec.

***

### type

> `readonly` **type**: `"dependencies"` \| `"devDependencies"` \| `"peerDependencies"` \| `"optionalDependencies"`

The type of the dependency in the dependent workspace's `package.json`
file (eg. `devDependencies`).
