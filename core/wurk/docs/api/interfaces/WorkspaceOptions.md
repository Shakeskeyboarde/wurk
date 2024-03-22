[Wurk API](../README.md) / WorkspaceOptions

# Interface: WorkspaceOptions

Workspace configuration.

## Implemented by

- [`Workspace`](../classes/Workspace.md)

## Table of contents

### Properties

- [config](WorkspaceOptions.md#config)
- [dir](WorkspaceOptions.md#dir)
- [getDependencyLinks](WorkspaceOptions.md#getdependencylinks)
- [getDependentLinks](WorkspaceOptions.md#getdependentlinks)
- [getPublished](WorkspaceOptions.md#getpublished)
- [isSelected](WorkspaceOptions.md#isselected)
- [log](WorkspaceOptions.md#log)
- [relativeDir](WorkspaceOptions.md#relativedir)

## Properties

### config

• `Readonly` **config**: [`JsonAccessor`](../classes/JsonAccessor.md)

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

##### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | [`WorkspaceLinkOptions`](WorkspaceLinkOptions.md) |

##### Returns

readonly [`WorkspaceLink`](WorkspaceLink.md)[]

___

### getPublished

• `Optional` `Readonly` **getPublished**: () => `Promise`\<``null`` \| [`WorkspacePublished`](WorkspacePublished.md)\>

Get publication information for the workspace. This will check the
NPM registry for the closest version which is less than or equal to (<=)
the current version.

Returns `null` if If the current version is less than all published
versions (or there are no published versions). Returns a metadata object
if the current version or a lesser version has been published. Compare
the returned metadata version to the workspace version to determine if
the exact current version has been published.

#### Type declaration

▸ (): `Promise`\<``null`` \| [`WorkspacePublished`](WorkspacePublished.md)\>

##### Returns

`Promise`\<``null`` \| [`WorkspacePublished`](WorkspacePublished.md)\>

___

### isSelected

• `Optional` `Readonly` **isSelected**: `boolean`

Initial selection state of the workspace.

___

### log

• `Optional` `Readonly` **log**: [`Log`](../classes/Log.md)

Logger which should be used for messages related to the workspace.

___

### relativeDir

• `Optional` `Readonly` **relativeDir**: `string`

Workspace directory relative to the root workspace.
