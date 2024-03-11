[Wurk API](../README.md) / WorkspaceCollection

# Class: WorkspaceCollection

An collection of workspaces with methods for selecting and iterating.

the `forEach*` methods and collection iterator only iterate over selected
workspaces by default. If the `includeDependencies` or `includeDependents`
options are set, then iteration will include dependency/dependent workspaces
that are not explicitly excluded.

The root workspace may not be included in iteration if the
`includeRootWorkspace` was not set when the collection was constructed. But,
the root workspace can always be accessed via the `root` property.

The `all` property is an iterable which includes all workspaces (may not
included the root workspace), regardless of selection status.

## Table of contents

### Accessors

- [iterableSize](WorkspaceCollection.md#iterablesize)
- [size](WorkspaceCollection.md#size)

### Constructors

- [constructor](WorkspaceCollection.md#constructor)

### Methods

- [forEach](WorkspaceCollection.md#foreach)
- [forEachParallel](WorkspaceCollection.md#foreachparallel)
- [forEachSequential](WorkspaceCollection.md#foreachsequential)
- [forEachStream](WorkspaceCollection.md#foreachstream)
- [forEachSync](WorkspaceCollection.md#foreachsync)
- [getDependencyLinks](WorkspaceCollection.md#getdependencylinks)
- [getDependentLinks](WorkspaceCollection.md#getdependentlinks)
- [includeDependencies](WorkspaceCollection.md#includedependencies)
- [includeDependents](WorkspaceCollection.md#includedependents)
- [select](WorkspaceCollection.md#select)

### Properties

- [all](WorkspaceCollection.md#all)
- [concurrency](WorkspaceCollection.md#concurrency)
- [root](WorkspaceCollection.md#root)

## Accessors

### iterableSize

• `get` **iterableSize**(): `number`

Number of workspaces which will be included in iteration. This respects
workspace selection and the inclusion of dependencies and dependents.

#### Returns

`number`

___

### size

• `get` **size**(): `number`

Number of workspaces in the collection. This may not include the root
workspace if the `includeRootWorkspace` option was not set. This is not
affected by workspace selection.

#### Returns

`number`

## Constructors

### constructor

• **new WorkspaceCollection**(`options`): [`WorkspaceCollection`](WorkspaceCollection.md)

Create a new workspace collection.

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`WorkspaceCollectionOptions`](../interfaces/WorkspaceCollectionOptions.md) |

#### Returns

[`WorkspaceCollection`](WorkspaceCollection.md)

## Methods

### forEach

▸ **forEach**(`callback`, `signal?`): `Promise`\<`void`\>

Iterate over selected workspaces. This method will behave like one of
the other `forEach*` methods, depending on the collection configuration.

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | [`WorkspaceCallback`](../README.md#workspacecallback) |
| `signal?` | `AbortSignal` |

#### Returns

`Promise`\<`void`\>

___

### forEachParallel

▸ **forEachParallel**(`callback`, `signal?`): `Promise`\<`void`\>

Iterate over selected workspaces in parallel, without regard for
topology or concurrency limits.

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | [`WorkspaceCallback`](../README.md#workspacecallback) |
| `signal?` | `AbortSignal` |

#### Returns

`Promise`\<`void`\>

___

### forEachSequential

▸ **forEachSequential**(`callback`, `signal?`): `Promise`\<`void`\>

Iterate over selected workspaces sequentially, without any concurrency.

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | [`WorkspaceCallback`](../README.md#workspacecallback) |
| `signal?` | `AbortSignal` |

#### Returns

`Promise`\<`void`\>

___

### forEachStream

▸ **forEachStream**(`callback`, `signal?`): `Promise`\<`void`\>

Iterate over selected workspaces in parallel, with topological awaiting
and concurrency limits.

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | [`WorkspaceCallback`](../README.md#workspacecallback) |
| `signal?` | `AbortSignal` |

#### Returns

`Promise`\<`void`\>

___

### forEachSync

▸ **forEachSync**(`callback`): `void`

Synchronously iterate over selected workspaces.

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`workspace`: [`Workspace`](Workspace.md)) => `void` |

#### Returns

`void`

___

### getDependencyLinks

▸ **getDependencyLinks**(`workspace`, `options?`): readonly [`WorkspaceLink`](../interfaces/WorkspaceLink.md)[]

Get dependency links for a workspace. This includes links to workspaces
which are not selected, even if they are explicitly excluded.

#### Parameters

| Name | Type |
| :------ | :------ |
| `workspace` | [`Workspace`](Workspace.md) |
| `options?` | [`WorkspaceLinkOptions`](../interfaces/WorkspaceLinkOptions.md) |

#### Returns

readonly [`WorkspaceLink`](../interfaces/WorkspaceLink.md)[]

___

### getDependentLinks

▸ **getDependentLinks**(`workspace`, `options?`): readonly [`WorkspaceLink`](../interfaces/WorkspaceLink.md)[]

Get dependent links for a workspace. This includes links to workspaces
which are not selected, even if they are explicitly excluded.

#### Parameters

| Name | Type |
| :------ | :------ |
| `workspace` | [`Workspace`](Workspace.md) |
| `options?` | [`WorkspaceLinkOptions`](../interfaces/WorkspaceLinkOptions.md) |

#### Returns

readonly [`WorkspaceLink`](../interfaces/WorkspaceLink.md)[]

___

### includeDependencies

▸ **includeDependencies**(`enabled?`): `void`

Include workspaces in iteration that are dependencies of selected
workspaces, as long as the dependency is not _explicitly_ excluded.

#### Parameters

| Name | Type |
| :------ | :------ |
| `enabled?` | `boolean` |

#### Returns

`void`

___

### includeDependents

▸ **includeDependents**(`enabled?`): `void`

Include workspaces in iteration that are dependents of selected
workspaces, as long as the dependency is not _explicitly_ excluded.

#### Parameters

| Name | Type |
| :------ | :------ |
| `enabled?` | `boolean` |

#### Returns

`void`

___

### select

▸ **select**(`condition`): `void`

Select workspaces by name, privacy, keyword, directory, or predicate
function.

- Use `private:true` or `private:false` to select private or public workspaces.
- Use `keyword:<pattern>` to select workspaces by keyword (glob supported).
- Use `dir:<pattern>` to select workspaces by directory (glob supported).
- Use `name:<pattern>` or just `<pattern>` to select workspaces by name (glob supported).
- Prefix any query with `not:` to exclude instead of include.
- Use a leading ellipsis to (eg. `...<query>`) to also match dependencies.
- Use a trailing ellipsis to (eg. `<query>...`) to also match dependents.

Glob patterns are supported via the
[minimatch](https://www.npmjs.com/package/minimatch) package.

#### Parameters

| Name | Type |
| :------ | :------ |
| `condition` | `SelectCondition` |

#### Returns

`void`

## Properties

### all

• `Readonly` **all**: `Iterable`\<[`Workspace`](Workspace.md)\>

All workspaces in the collection, regardless of selection status.

___

### concurrency

• `Readonly` **concurrency**: `number`

Maximum workspaces which may be processed in parallel using the
asynchronous `forEach*` methods.

___

### root

• `Readonly` **root**: [`Workspace`](Workspace.md)

The root workspace.
