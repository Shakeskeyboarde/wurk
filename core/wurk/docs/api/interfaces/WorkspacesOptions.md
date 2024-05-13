[**Wurk API**](../README.md) • **Docs**

***

[Wurk API](../README.md) / WorkspacesOptions

# Interface: WorkspacesOptions

Workspace collection options.

## Properties

### concurrency?

> `optional` `readonly` **concurrency**: `number`

Maximum workspaces which may be processed simultaneously using the
asynchronous `forEachStream()` method. Also affects the `forEach()`
method if the `defaultIterationMethod` option is set to `forEachStream`.

***

### defaultIterationMethod?

> `optional` `readonly` **defaultIterationMethod**: `"forEachParallel"` \| `"forEachStream"` \| `"forEachSequential"`

Default iteration method.

***

### delaySeconds?

> `optional` `readonly` **delaySeconds**: `number`

Delay a given number of seconds before invoking the next `forEach*`
callback. This delay applies across invocations of the `forEach*`
methods, but only within a single `Workspaces` instance.

***

### getPublished()?

> `optional` `readonly` **getPublished**: (`name`, `version`) => `Promise`\<`null` \| [`WorkspacePublished`](WorkspacePublished.md)\>

Determine if a workspace version is published or not.

#### Parameters

• **name**: `string`

• **version**: `string`

#### Returns

`Promise`\<`null` \| [`WorkspacePublished`](WorkspacePublished.md)\>

***

### rootDir

> `readonly` **rootDir**: `string`

The directory of the root workspace.

***

### workspaceEntries?

> `optional` `readonly` **workspaceEntries**: readonly readonly [`string`, [`JsonAccessor`](../classes/JsonAccessor.md)][]

Array of workspaces as tuples of directory and configuration (package.json).
