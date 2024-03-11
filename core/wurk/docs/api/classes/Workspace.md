[Wurk API](../README.md) / Workspace

# Class: Workspace

Workspace information and utilities.

## Table of contents

### Accessors

- [isDependencyOfSelected](Workspace.md#isdependencyofselected)
- [isDependentOfSelected](Workspace.md#isdependentofselected)

### Constructors

- [constructor](Workspace.md#constructor)

### Properties

- [config](Workspace.md#config)
- [dir](Workspace.md#dir)
- [getDependencyLinks](Workspace.md#getdependencylinks)
- [getDependentLinks](Workspace.md#getdependentlinks)
- [getEntrypoints](Workspace.md#getentrypoints)
- [isPrivate](Workspace.md#isprivate)
- [isRoot](Workspace.md#isroot)
- [isSelected](Workspace.md#isselected)
- [log](Workspace.md#log)
- [name](Workspace.md#name)
- [relativeDir](Workspace.md#relativedir)
- [spawn](Workspace.md#spawn)
- [version](Workspace.md#version)

## Accessors

### isDependencyOfSelected

• `get` **isDependencyOfSelected**(): `boolean`

True if this workspace is a dependency of any selected workspace.

#### Returns

`boolean`

___

### isDependentOfSelected

• `get` **isDependentOfSelected**(): `boolean`

True if this workspace is a dependent of (ie. depends on) any selected
workspace.

#### Returns

`boolean`

## Constructors

### constructor

• **new Workspace**(`options`): [`Workspace`](Workspace.md)

This is generally intended for internal use only. Use workspace
collections instead, which create their own workspace instances.

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`WorkspaceOptions`](../interfaces/WorkspaceOptions.md) |

#### Returns

[`Workspace`](Workspace.md)

## Properties

### config

• `Readonly` **config**: `JsonAccessor`

JSON decoded workspace `package.json` file.

___

### dir

• `Readonly` **dir**: `string`

Absolute path of the workspace directory.

___

### getDependencyLinks

• `Readonly` **getDependencyLinks**: (`options?`: [`WorkspaceLinkOptions`](../interfaces/WorkspaceLinkOptions.md)) => readonly [`WorkspaceLink`](../interfaces/WorkspaceLink.md)[]

Get all immediate local dependency workspaces.

#### Type declaration

▸ (`options?`): readonly [`WorkspaceLink`](../interfaces/WorkspaceLink.md)[]

Get all immediate local dependency workspaces.

##### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | [`WorkspaceLinkOptions`](../interfaces/WorkspaceLinkOptions.md) |

##### Returns

readonly [`WorkspaceLink`](../interfaces/WorkspaceLink.md)[]

___

### getDependentLinks

• `Readonly` **getDependentLinks**: (`options?`: [`WorkspaceLinkOptions`](../interfaces/WorkspaceLinkOptions.md)) => readonly [`WorkspaceLink`](../interfaces/WorkspaceLink.md)[]

Get all immediate local dependent workspaces.

#### Type declaration

▸ (`options?`): readonly [`WorkspaceLink`](../interfaces/WorkspaceLink.md)[]

Get all immediate local dependent workspaces.

##### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | [`WorkspaceLinkOptions`](../interfaces/WorkspaceLinkOptions.md) |

##### Returns

readonly [`WorkspaceLink`](../interfaces/WorkspaceLink.md)[]

___

### getEntrypoints

• `Readonly` **getEntrypoints**: () => readonly `Entrypoint`[]

Return a list of all of the entry points in the workspace
`package.json` file. These are the files that should be built and
published with the package.

#### Type declaration

▸ (): readonly `Entrypoint`[]

Return a list of all of the entry points in the workspace
`package.json` file. These are the files that should be built and
published with the package.

##### Returns

readonly `Entrypoint`[]

___

### isPrivate

• `Readonly` **isPrivate**: `boolean`

True if this workspace has the `private` field set to `true` in its
`package.json` file.

___

### isRoot

• `Readonly` **isRoot**: `boolean`

True if this is the root workspace.

___

### isSelected

• **isSelected**: ``null`` \| `boolean`

True if the workspace is explicitly included by command line options,
false if it's explicitly _excluded_, and null if it is not explicitly
included or excluded.

Null values should generally be treated as "not selected". Some commands
may choose to treat null as "selected-if-necessary". For example, the
[build](https://npmjs.com/package/@wurk/build) command will build
dependencies of selected (true) workspaces, as long as the dependency
is not explicitly excluded (false).

**Note:** This property is mutable so that command plugins can apply
their own selection logic.

___

### log

• `Readonly` **log**: `Log`

Logger which should be used for messages related to the workspace.

___

### name

• `Readonly` **name**: `string`

Workspace package name.

___

### relativeDir

• `Readonly` **relativeDir**: `string`

Workspace directory relative to the root workspace.

___

### spawn

• `Readonly` **spawn**: (`cmd`: `string`, `sparseArgs?`: `SpawnSparseArgs`, `options?`: `SpawnOptions`) => `Promise`\<`SpawnResult`\>

Spawn a child process.

#### Type declaration

▸ (`cmd`, `sparseArgs?`, `options?`): `Promise`\<`SpawnResult`\>

Spawn a child process.

##### Parameters

| Name | Type |
| :------ | :------ |
| `cmd` | `string` |
| `sparseArgs?` | `SpawnSparseArgs` |
| `options?` | `SpawnOptions` |

##### Returns

`Promise`\<`SpawnResult`\>

___

### version

• `Readonly` **version**: `undefined` \| `string`

Workspace package version.
