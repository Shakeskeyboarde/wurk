[**Wurk API**](../README.md) • **Docs**

***

[Wurk API](../README.md) / Workspaces

# Class: Workspaces

An collection of workspaces with methods for selecting and iterating.

the `forEach*` methods and collection iterator only iterate over selected
workspaces.

The `all` property is an iterable which includes all workspaces, regardless
of selection status.

## Accessors

### selectedSize

> `get` **selectedSize**(): `number`

Number of workspaces which will be included in iteration. This respects
workspace selection and the inclusion of dependencies and dependents.

#### Returns

`number`

## Constructors

### new Workspaces()

> **new Workspaces**(`options`): [`Workspaces`](Workspaces.md)

Create a new workspace collection.

#### Parameters

• **options**: [`WorkspacesOptions`](../interfaces/WorkspacesOptions.md)

#### Returns

[`Workspaces`](Workspaces.md)

## Methods

### `[iterator]`()

> **\[iterator\]**(): `Iterator`\<[`Workspace`](Workspace.md), `any`, `undefined`\>

Get an iterator for selected workspaces.

#### Returns

`Iterator`\<[`Workspace`](Workspace.md), `any`, `undefined`\>

***

### \_forEachAsync()

> `protected` **\_forEachAsync**(`options`): `Promise`\<`void`\>

Asynchronously iterate over selected workspaces.

#### Parameters

• **options**

• **options.callback**: [`WorkspaceCallback`](../type-aliases/WorkspaceCallback.md)

• **options.concurrency**: `number`

• **options.signal**: `undefined` \| `AbortSignal`

• **options.stream**: `boolean`

#### Returns

`Promise`\<`void`\>

***

### exclude()

> **exclude**(`expression`): `Promise`\<`void`\>

Exclude workspaces by name, directory, keyword, or other characteristics.

See the [include](Workspaces.md#include) method for expression syntax.

#### Parameters

• **expression**: `string` \| `WorkspacePredicate`

#### Returns

`Promise`\<`void`\>

***

### forEach()

> **forEach**(`callback`, `signal`?): `Promise`\<`void`\>

Iterate over selected workspaces. This method will behave like one of
the other `forEach*` methods, depending on the collection configuration.

#### Parameters

• **callback**: [`WorkspaceCallback`](../type-aliases/WorkspaceCallback.md)

• **signal?**: `AbortSignal`

#### Returns

`Promise`\<`void`\>

***

### forEachParallel()

> **forEachParallel**(`callback`, `signal`?): `Promise`\<`void`\>

Iterate over selected workspaces in parallel, without regard for
topology or concurrency limits.

#### Parameters

• **callback**: [`WorkspaceCallback`](../type-aliases/WorkspaceCallback.md)

• **signal?**: `AbortSignal`

#### Returns

`Promise`\<`void`\>

***

### forEachSequential()

> **forEachSequential**(`callback`, `signal`?): `Promise`\<`void`\>

Iterate over selected workspaces sequentially, without any concurrency.

#### Parameters

• **callback**: [`WorkspaceCallback`](../type-aliases/WorkspaceCallback.md)

• **signal?**: `AbortSignal`

#### Returns

`Promise`\<`void`\>

***

### forEachStream()

> **forEachStream**(`callback`, `signal`?): `Promise`\<`void`\>

Iterate over selected workspaces in parallel, with topological awaiting
and concurrency limits.

#### Parameters

• **callback**: [`WorkspaceCallback`](../type-aliases/WorkspaceCallback.md)

• **signal?**: `AbortSignal`

#### Returns

`Promise`\<`void`\>

***

### forEachSync()

> **forEachSync**(`callback`): `void`

Synchronously iterate over selected workspaces.

#### Parameters

• **callback**

#### Returns

`void`

***

### include()

> **include**(`expression`): `Promise`\<`void`\>

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

• **expression**: `string` \| `WorkspacePredicate`

#### Returns

`Promise`\<`void`\>

## Properties

### all

> `readonly` **all**: `Iterable`\<[`Workspace`](Workspace.md)\>

All workspaces in the collection, regardless of selection status.

***

### concurrency

> `readonly` **concurrency**: `number`

Maximum workspaces which may be processed in parallel using the
asynchronous `forEach*` methods.

***

### delaySeconds

> `readonly` **delaySeconds**: `number`

Delay a given number of seconds before invoking the next `forEach*`
callback.

***

### size

> `readonly` **size**: `number`

Number of workspaces in the collection.
