[Wurk API](../README.md) / Workspace

# Class: Workspace

Workspace information and utilities.

## Implements

- [`WorkspaceOptions`](../interfaces/WorkspaceOptions.md)

## Table of contents

### Accessors

- [isDependencyOfSelected](Workspace.md#isdependencyofselected)
- [isDependentOfSelected](Workspace.md#isdependentofselected)

### Constructors

- [constructor](Workspace.md#constructor)

### Properties

- [config](Workspace.md#config)
- [dependencies](Workspace.md#dependencies)
- [dir](Workspace.md#dir)
- [getDependencyLinks](Workspace.md#getdependencylinks)
- [getDependentLinks](Workspace.md#getdependentlinks)
- [getEntrypoints](Workspace.md#getentrypoints)
- [getPublished](Workspace.md#getpublished)
- [isPrivate](Workspace.md#isprivate)
- [isSelected](Workspace.md#isselected)
- [log](Workspace.md#log)
- [name](Workspace.md#name)
- [relativeDir](Workspace.md#relativedir)
- [spawn](Workspace.md#spawn)
- [temp](Workspace.md#temp)
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

• `Readonly` **config**: [`JsonAccessor`](JsonAccessor.md)

Workspace configuration (package.json).

#### Implementation of

[WorkspaceOptions](../interfaces/WorkspaceOptions.md).[config](../interfaces/WorkspaceOptions.md#config)

___

### dependencies

• `Readonly` **dependencies**: readonly `WorkspaceDependency`[]

All workspace dependencies (not just local).

___

### dir

• `Readonly` **dir**: `string`

Absolute path of the workspace directory.

#### Implementation of

[WorkspaceOptions](../interfaces/WorkspaceOptions.md).[dir](../interfaces/WorkspaceOptions.md#dir)

___

### getDependencyLinks

• `Readonly` **getDependencyLinks**: (`options?`: [`WorkspaceLinkOptions`](../interfaces/WorkspaceLinkOptions.md)) => readonly [`WorkspaceLink`](../interfaces/WorkspaceLink.md)[]

Get links to local dependency workspaces.

#### Type declaration

▸ (`options?`): readonly [`WorkspaceLink`](../interfaces/WorkspaceLink.md)[]

##### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | [`WorkspaceLinkOptions`](../interfaces/WorkspaceLinkOptions.md) |

##### Returns

readonly [`WorkspaceLink`](../interfaces/WorkspaceLink.md)[]

#### Implementation of

[WorkspaceOptions](../interfaces/WorkspaceOptions.md).[getDependencyLinks](../interfaces/WorkspaceOptions.md#getdependencylinks)

___

### getDependentLinks

• `Readonly` **getDependentLinks**: (`options?`: [`WorkspaceLinkOptions`](../interfaces/WorkspaceLinkOptions.md)) => readonly [`WorkspaceLink`](../interfaces/WorkspaceLink.md)[]

Get links to local dependent workspaces.

#### Type declaration

▸ (`options?`): readonly [`WorkspaceLink`](../interfaces/WorkspaceLink.md)[]

##### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | [`WorkspaceLinkOptions`](../interfaces/WorkspaceLinkOptions.md) |

##### Returns

readonly [`WorkspaceLink`](../interfaces/WorkspaceLink.md)[]

#### Implementation of

[WorkspaceOptions](../interfaces/WorkspaceOptions.md).[getDependentLinks](../interfaces/WorkspaceOptions.md#getdependentlinks)

___

### getEntrypoints

• `Readonly` **getEntrypoints**: () => readonly `Entrypoint`[]

Return a list of all of the entry points in the workspace
`package.json` file. These are the files that should be built and
published with the package.

#### Type declaration

▸ (): readonly `Entrypoint`[]

##### Returns

readonly `Entrypoint`[]

___

### getPublished

• `Readonly` **getPublished**: () => `Promise`\<``null`` \| `WorkspacePublished`\>

Get publication information for the workspace.

#### Type declaration

▸ (): `Promise`\<``null`` \| `WorkspacePublished`\>

##### Returns

`Promise`\<``null`` \| `WorkspacePublished`\>

#### Implementation of

[WorkspaceOptions](../interfaces/WorkspaceOptions.md).[getPublished](../interfaces/WorkspaceOptions.md#getpublished)

___

### isPrivate

• `Readonly` **isPrivate**: `boolean`

True if this workspace has the `private` field set to `true` in its
`package.json` file.

___

### isSelected

• **isSelected**: `boolean`

True if this workspace will be included in `forEach*` method iterations.

**Note:** This property is intentionally mutable to allow for dynamic
selection of workspaces. Changes to this property will not hav

#### Implementation of

[WorkspaceOptions](../interfaces/WorkspaceOptions.md).[isSelected](../interfaces/WorkspaceOptions.md#isselected)

___

### log

• `Readonly` **log**: `Log`

Logger which should be used for messages related to workspace processing.

#### Implementation of

[WorkspaceOptions](../interfaces/WorkspaceOptions.md).[log](../interfaces/WorkspaceOptions.md#log)

___

### name

• `Readonly` **name**: `string`

Workspace package name.

___

### relativeDir

• `Readonly` **relativeDir**: `string`

Workspace directory relative to the root workspace.

#### Implementation of

[WorkspaceOptions](../interfaces/WorkspaceOptions.md).[relativeDir](../interfaces/WorkspaceOptions.md#relativedir)

___

### spawn

• `Readonly` **spawn**: (`cmd`: `string`, `sparseArgs?`: `SpawnSparseArgs`, ...`options`: `SpawnOptions`[]) => `Promise`\<`SpawnResult`\>

Spawn a child process.

#### Type declaration

▸ (`cmd`, `sparseArgs?`, `...options`): `Promise`\<`SpawnResult`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `cmd` | `string` |
| `sparseArgs?` | `SpawnSparseArgs` |
| `...options` | `SpawnOptions`[] |

##### Returns

`Promise`\<`SpawnResult`\>

___

### temp

• `Readonly` **temp**: (`prefix?`: `string`, `options?`: \{ `local?`: `boolean`  }) => `Promise`\<`string`\>

Create a temporary directory which will be cleaned up when the process
exits.

#### Type declaration

▸ (`prefix?`, `options?`): `Promise`\<`string`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `prefix?` | `string` |
| `options?` | `Object` |
| `options.local?` | `boolean` |

##### Returns

`Promise`\<`string`\>

___

### version

• `Readonly` **version**: `undefined` \| `string`

Workspace package version.
