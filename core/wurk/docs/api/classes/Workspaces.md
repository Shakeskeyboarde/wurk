[Wurk API](../README.md) / Workspaces

# Class: Workspaces

An collection of workspaces with methods for selecting and iterating.

the `forEach*` methods and collection iterator only iterate over selected
workspaces.

The `all` property is an iterable which includes all workspaces, regardless
of selection status.

## Table of contents

### Accessors

- [selectedSize](Workspaces.md#selectedsize)

### Constructors

- [constructor](Workspaces.md#constructor)

### Methods

- [exclude](Workspaces.md#exclude)
- [forEach](Workspaces.md#foreach)
- [forEachParallel](Workspaces.md#foreachparallel)
- [forEachSequential](Workspaces.md#foreachsequential)
- [forEachStream](Workspaces.md#foreachstream)
- [forEachSync](Workspaces.md#foreachsync)
- [include](Workspaces.md#include)

### Properties

- [all](Workspaces.md#all)
- [concurrency](Workspaces.md#concurrency)
- [delaySeconds](Workspaces.md#delayseconds)
- [size](Workspaces.md#size)

## Accessors

### selectedSize

• `get` **selectedSize**(): `number`

Number of workspaces which will be included in iteration. This respects
workspace selection and the inclusion of dependencies and dependents.

#### Returns

`number`

## Constructors

### constructor

• **new Workspaces**(`options`): [`Workspaces`](Workspaces.md)

Create a new workspace collection.

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`WorkspacesOptions`](../interfaces/WorkspacesOptions.md) |

#### Returns

[`Workspaces`](Workspaces.md)

## Methods

### exclude

▸ **exclude**(`expression`): `Promise`\<`void`\>

Exclude workspaces by name, directory, keyword, or other characteristics.

See the [include](Workspaces.md#include) method for expression syntax.

#### Parameters

| Name | Type |
| :------ | :------ |
| `expression` | `string` \| `WorkspacePredicate` |

#### Returns

`Promise`\<`void`\>

___

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

### include

▸ **include**(`expression`): `Promise`\<`void`\>

Include workspaces by name, directory, keyword, or other characteristics.

Expressions:
- `<name>`: Select workspaces by name (glob supported).
- `/path`: Select workspaces by path relative to the root workspace (glob supported).
- `#<keywords>`: Select workspaces which contain all keywords (csv).
- `@private`: Select private workspaces.
- `@public`: Select public (non-private) workspaces.
- `@published`: Select workspaces which are published to an NPM registry.
- `@unpublished`: Select workspaces which are not published to an NPM registry.
- `@dependency`: Select workspaces which are depended on by currently selected workspaces.
- `@dependent`: Select workspaces which depend on currently selected workspaces.

Glob patterns are supported via the
[minimatch](https://www.npmjs.com/package/minimatch) package.

#### Parameters

| Name | Type |
| :------ | :------ |
| `expression` | `string` \| `WorkspacePredicate` |

#### Returns

`Promise`\<`void`\>

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

### delaySeconds

• `Readonly` **delaySeconds**: `number`

Delay a given number of seconds before invoking the next `forEach*`
callback.

___

### size

• `Readonly` **size**: `number`

Number of workspaces in the collection.
