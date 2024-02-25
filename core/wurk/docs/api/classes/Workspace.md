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

- [clean](Workspace.md#clean)
- [config](Workspace.md#config)
- [dir](Workspace.md#dir)
- [fs](Workspace.md#fs)
- [getDependencyLinks](Workspace.md#getdependencylinks)
- [getDependentLinks](Workspace.md#getdependentlinks)
- [getEntrypoints](Workspace.md#getentrypoints)
- [getIsModified](Workspace.md#getismodified)
- [getMissingEntrypoints](Workspace.md#getmissingentrypoints)
- [git](Workspace.md#git)
- [importRelative](Workspace.md#importrelative)
- [importRelativeResolve](Workspace.md#importrelativeresolve)
- [isPrivate](Workspace.md#isprivate)
- [isRoot](Workspace.md#isroot)
- [isSelected](Workspace.md#isselected)
- [log](Workspace.md#log)
- [name](Workspace.md#name)
- [npm](Workspace.md#npm)
- [relativeDir](Workspace.md#relativedir)
- [status](Workspace.md#status)
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

### clean

• `Readonly` **clean**: () => `Promise`\<`string`[]\>

Remove files and directories from the workspace which are ignored by
Git, _except_ for `node_modules` and dot-files (eg. `.gitignore`,
`.vscode`, etc.).

#### Type declaration

▸ (): `Promise`\<`string`[]\>

Remove files and directories from the workspace which are ignored by
Git, _except_ for `node_modules` and dot-files (eg. `.gitignore`,
`.vscode`, etc.).

##### Returns

`Promise`\<`string`[]\>

___

### config

• `Readonly` **config**: `JsonAccessor`

JSON decoded workspace `package.json` file.

___

### dir

• `Readonly` **dir**: `string`

Absolute path of the workspace directory.

___

### fs

• `Readonly` **fs**: `Fs`

File system utilities relative to this workspace's directory.

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

### getIsModified

• `Readonly` **getIsModified**: () => `Promise`\<`boolean`\>

Try to detect changes using git commits, and fall back to assuming
modifications if that doesn't work.

Return true if the NPM published head commit and the current Git
head commit do not match, or if the directory is not part of a Git
working tree, or if no published head commit is available.

**Note:** This method will throw an error if the Git repository is
a shallow clone!

#### Type declaration

▸ (): `Promise`\<`boolean`\>

Try to detect changes using git commits, and fall back to assuming
modifications if that doesn't work.

Return true if the NPM published head commit and the current Git
head commit do not match, or if the directory is not part of a Git
working tree, or if no published head commit is available.

**Note:** This method will throw an error if the Git repository is
a shallow clone!

##### Returns

`Promise`\<`boolean`\>

___

### getMissingEntrypoints

• `Readonly` **getMissingEntrypoints**: () => `Promise`\<`Entrypoint`[]\>

Return a list of all the workspace entry points that are missing.

**Note:** Entry points which include a wildcard are ignored.

#### Type declaration

▸ (): `Promise`\<`Entrypoint`[]\>

Return a list of all the workspace entry points that are missing.

**Note:** Entry points which include a wildcard are ignored.

##### Returns

`Promise`\<`Entrypoint`[]\>

___

### git

• `Readonly` **git**: `Git`

Git utilities relative to this workspace's directory.

___

### importRelative

• `Readonly` **importRelative**: \<TExports\>(`name`: `string`, `versionRange?`: `string`) => `Promise`\<`ImportResult`\<`TExports`\>\>

Import relative to the workspace directory, instead of relative to the
current file. This method should be used to import optional command
dependencies, because it allows per-workspace package installation.

The `versionRange` option can be a semver range, just like a dependency
in your `package.json` file.

**Note:** There's no way to infer the type of the imported module.
However, TypeScript type imports are not emitted in compiled code,
so you can safely import the module type, and then use this method
to import the implementation.

#### Type declaration

▸ \<`TExports`\>(`name`, `versionRange?`): `Promise`\<`ImportResult`\<`TExports`\>\>

Import relative to the workspace directory, instead of relative to the
current file. This method should be used to import optional command
dependencies, because it allows per-workspace package installation.

The `versionRange` option can be a semver range, just like a dependency
in your `package.json` file.

**Note:** There's no way to infer the type of the imported module.
However, TypeScript type imports are not emitted in compiled code,
so you can safely import the module type, and then use this method
to import the implementation.

##### Type parameters

| Name | Type |
| :------ | :------ |
| `TExports` | extends `Record`\<`string`, `any`\> = `Record`\<`string`, `unknown`\> |

##### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `versionRange?` | `string` |

##### Returns

`Promise`\<`ImportResult`\<`TExports`\>\>

___

### importRelativeResolve

• `Readonly` **importRelativeResolve**: (`name`: `string`, `versionRange?`: `string`) => `Promise`\<`ImportResolved`\>

#### Type declaration

▸ (`name`, `versionRange?`): `Promise`\<`ImportResolved`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `versionRange?` | `string` |

##### Returns

`Promise`\<`ImportResolved`\>

___

### isPrivate

• `Readonly` **isPrivate**: `boolean`

True if this workspace has the `private` field set to `true` in its
`package.json` file.

___

### isRoot

• `Readonly` **isRoot**: `boolean`

True if this is the workspaces root package.

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

### npm

• `Readonly` **npm**: `Npm`

NPM utilities for this workspace's name.

___

### relativeDir

• `Readonly` **relativeDir**: `string`

Workspace directory relative to the root workspace.

___

### status

• `Readonly` **status**: `Status`

Workspace status tracking, used to (optionally) print a collective
status message for multiple workspaces.

___

### version

• `Readonly` **version**: `undefined` \| `string`

Workspace package version.
