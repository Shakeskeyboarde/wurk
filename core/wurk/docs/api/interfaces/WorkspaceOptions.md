[Wurk API](../README.md) / WorkspaceOptions

# Interface: WorkspaceOptions

Workspace configuration.

## Table of contents

### Properties

- [config](WorkspaceOptions.md#config)
- [dir](WorkspaceOptions.md#dir)
- [getDependencyLinks](WorkspaceOptions.md#getdependencylinks)
- [getDependentLinks](WorkspaceOptions.md#getdependentlinks)
- [gitHead](WorkspaceOptions.md#githead)
- [relativeDir](WorkspaceOptions.md#relativedir)

## Properties

### config

• `Readonly` **config**: `JsonAccessor`

Workspace configuration (package.json).

___

### dir

• `Readonly` **dir**: `string`

Absolute path of the workspace directory.

___

### getDependencyLinks

• `Optional` `Readonly` **getDependencyLinks**: (`options?`: [`WorkspaceLinkOptions`](WorkspaceLinkOptions.md)) => readonly [`WorkspaceLink`](WorkspaceLink.md)[]

Resolve links to local dependency workspaces.

#### Type declaration

▸ (`options?`): readonly [`WorkspaceLink`](WorkspaceLink.md)[]

Resolve links to local dependency workspaces.

##### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | [`WorkspaceLinkOptions`](WorkspaceLinkOptions.md) |

##### Returns

readonly [`WorkspaceLink`](WorkspaceLink.md)[]

___

### getDependentLinks

• `Optional` `Readonly` **getDependentLinks**: (`options?`: [`WorkspaceLinkOptions`](WorkspaceLinkOptions.md)) => readonly [`WorkspaceLink`](WorkspaceLink.md)[]

Resolve links to local dependent workspaces.

#### Type declaration

▸ (`options?`): readonly [`WorkspaceLink`](WorkspaceLink.md)[]

Resolve links to local dependent workspaces.

##### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | [`WorkspaceLinkOptions`](WorkspaceLinkOptions.md) |

##### Returns

readonly [`WorkspaceLink`](WorkspaceLink.md)[]

___

### gitHead

• `Optional` `Readonly` **gitHead**: `string`

Override the Git head commit hash published to the NPM registry.

___

### relativeDir

• `Optional` `Readonly` **relativeDir**: `string`

Path of the workspace directory relative to the root workspace. If this
is omitted, blank, or `"."`, then the workspace is the root workspace.
