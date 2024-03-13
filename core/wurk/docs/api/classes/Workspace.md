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

- [getEntrypoints](Workspace.md#getentrypoints)
- [isPrivate](Workspace.md#isprivate)
- [isSelected](Workspace.md#isselected)
- [name](Workspace.md#name)
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

### isSelected

• **isSelected**: `boolean`

True if this workspace will be included in `forEach*` method iterations.

**Note:** This property is intentionally mutable to allow for dynamic
selection of workspaces. Changes to this property will not hav

___

### name

• `Readonly` **name**: `string`

Workspace package name.

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
