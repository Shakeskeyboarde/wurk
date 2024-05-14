[**Wurk API**](../README.md) • **Docs**

***

[Wurk API](../README.md) / Workspace

# Class: Workspace

Workspace information and utilities.

## Implements

- [`WorkspaceOptions`](../interfaces/WorkspaceOptions.md)

## Accessors

### isDependencyOfSelected

> `get` **isDependencyOfSelected**(): `boolean`

True if this workspace is a dependency of any selected workspace.

#### Returns

`boolean`

***

### isDependentOfSelected

> `get` **isDependentOfSelected**(): `boolean`

True if this workspace is a dependent of (ie. depends on) any selected
workspace.

#### Returns

`boolean`

## Constructors

### new Workspace()

> **new Workspace**(`options`): [`Workspace`](Workspace.md)

This is generally intended for internal use only. Use workspace
collections instead, which create their own workspace instances.

#### Parameters

• **options**: [`WorkspaceOptions`](../interfaces/WorkspaceOptions.md)

#### Returns

[`Workspace`](Workspace.md)

## Properties

### config

> `readonly` **config**: [`JsonAccessor`](JsonAccessor.md)

Workspace configuration (package.json).

#### Implementation of

[`WorkspaceOptions`](../interfaces/WorkspaceOptions.md).[`config`](../interfaces/WorkspaceOptions.md#config)

***

### dependencies

> `readonly` **dependencies**: readonly [`WorkspaceDependency`](../interfaces/WorkspaceDependency.md)[]

All workspace dependencies (not just local).

***

### dir

> `readonly` **dir**: `string`

Absolute path of the workspace directory.

#### Implementation of

[`WorkspaceOptions`](../interfaces/WorkspaceOptions.md).[`dir`](../interfaces/WorkspaceOptions.md#dir)

***

### getDependencyLinks()

> `readonly` **getDependencyLinks**: (`options`?) => readonly [`WorkspaceLink`](../interfaces/WorkspaceLink.md)[]

Get links to local dependency workspaces.

#### Parameters

• **options?**: [`WorkspaceLinkOptions`](../interfaces/WorkspaceLinkOptions.md)

#### Returns

readonly [`WorkspaceLink`](../interfaces/WorkspaceLink.md)[]

#### Implementation of

[`WorkspaceOptions`](../interfaces/WorkspaceOptions.md).[`getDependencyLinks`](../interfaces/WorkspaceOptions.md#getdependencylinks)

***

### getDependentLinks()

> `readonly` **getDependentLinks**: (`options`?) => readonly [`WorkspaceLink`](../interfaces/WorkspaceLink.md)[]

Get links to local dependent workspaces.

#### Parameters

• **options?**: [`WorkspaceLinkOptions`](../interfaces/WorkspaceLinkOptions.md)

#### Returns

readonly [`WorkspaceLink`](../interfaces/WorkspaceLink.md)[]

#### Implementation of

[`WorkspaceOptions`](../interfaces/WorkspaceOptions.md).[`getDependentLinks`](../interfaces/WorkspaceOptions.md#getdependentlinks)

***

### getEntrypoints()

> `readonly` **getEntrypoints**: () => readonly `WorkspaceEntrypoint`[]

Return a list of all of the entry points in the workspace
`package.json` file. These are the files that should be built and
published with the package.

#### Returns

readonly `WorkspaceEntrypoint`[]

***

### getPublished()

> `readonly` **getPublished**: () => `Promise`\<`null` \| [`WorkspacePublished`](../interfaces/WorkspacePublished.md)\>

Get publication information for the workspace.

#### Returns

`Promise`\<`null` \| [`WorkspacePublished`](../interfaces/WorkspacePublished.md)\>

#### Implementation of

[`WorkspaceOptions`](../interfaces/WorkspaceOptions.md).[`getPublished`](../interfaces/WorkspaceOptions.md#getpublished)

***

### isPrivate

> `readonly` **isPrivate**: `boolean`

True if this workspace has the `private` field set to `true` in its
`package.json` file.

***

### isSelected

> **isSelected**: `boolean`

True if this workspace will be included in `forEach*` method iterations.

**Note:** This property is intentionally mutable to allow for dynamic
selection of workspaces. Changes to this property will not hav

#### Implementation of

[`WorkspaceOptions`](../interfaces/WorkspaceOptions.md).[`isSelected`](../interfaces/WorkspaceOptions.md#isselected)

***

### log

> `readonly` **log**: [`Log`](Log.md)

Logger which should be used for messages related to workspace processing.

#### Implementation of

[`WorkspaceOptions`](../interfaces/WorkspaceOptions.md).[`log`](../interfaces/WorkspaceOptions.md#log)

***

### name

> `readonly` **name**: `string`

Workspace package name.

***

### relativeDir

> `readonly` **relativeDir**: `string`

Workspace directory relative to the root workspace.

#### Implementation of

[`WorkspaceOptions`](../interfaces/WorkspaceOptions.md).[`relativeDir`](../interfaces/WorkspaceOptions.md#relativedir)

***

### spawn()

> `readonly` **spawn**: (`cmd`, `sparseArgs`?, ...`options`) => `Promise`\<[`SpawnResult`](../interfaces/SpawnResult.md)\>

Spawn a child process.

#### Parameters

• **cmd**: `string`

• **sparseArgs?**: `SpawnSparseArgs`

• ...**options?**: [`SpawnOptions`](../interfaces/SpawnOptions.md)[]

#### Returns

`Promise`\<[`SpawnResult`](../interfaces/SpawnResult.md)\>

***

### temp()

> `readonly` **temp**: (`prefix`?, `options`?) => `Promise`\<`string`\>

Create a temporary directory which will be cleaned up when the process
exits.

#### Parameters

• **prefix?**: `string`

• **options?**

• **options.local?**: `boolean`

#### Returns

`Promise`\<`string`\>

***

### version

> `readonly` **version**: `undefined` \| `string`

Workspace package version.
