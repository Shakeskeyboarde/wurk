[Wurk API](../README.md) / WorkspacesOptions

# Interface: WorkspacesOptions

Workspace collection options.

## Table of contents

### Properties

- [concurrency](WorkspacesOptions.md#concurrency)
- [defaultIterationMethod](WorkspacesOptions.md#defaultiterationmethod)
- [delaySeconds](WorkspacesOptions.md#delayseconds)
- [getPublished](WorkspacesOptions.md#getpublished)
- [rootDir](WorkspacesOptions.md#rootdir)
- [workspaceEntries](WorkspacesOptions.md#workspaceentries)

## Properties

### concurrency

• `Optional` `Readonly` **concurrency**: `number`

Maximum workspaces which may be processed simultaneously using the
asynchronous `forEachStream()` method. Also affects the `forEach()`
method if the `defaultIterationMethod` option is set to `forEachStream`.

___

### defaultIterationMethod

• `Optional` `Readonly` **defaultIterationMethod**: ``"forEachParallel"`` \| ``"forEachStream"`` \| ``"forEachSequential"``

Default iteration method.

___

### delaySeconds

• `Optional` `Readonly` **delaySeconds**: `number`

Delay a given number of seconds before invoking the next `forEach*`
callback. This delay applies across invocations of the `forEach*`
methods, but only within a single `Workspaces` instance.

___

### getPublished

• `Optional` `Readonly` **getPublished**: (`name`: `string`, `version`: `string`) => `Promise`\<``null`` \| [`WorkspacePublished`](WorkspacePublished.md)\>

Determine if a workspace version is published or not.

#### Type declaration

▸ (`name`, `version`): `Promise`\<``null`` \| [`WorkspacePublished`](WorkspacePublished.md)\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `version` | `string` |

##### Returns

`Promise`\<``null`` \| [`WorkspacePublished`](WorkspacePublished.md)\>

___

### rootDir

• `Readonly` **rootDir**: `string`

The directory of the root workspace.

___

### workspaceEntries

• `Optional` `Readonly` **workspaceEntries**: readonly readonly [`string`, [`JsonAccessor`](../classes/JsonAccessor.md)][]

Array of workspaces as tuples of directory and configuration (package.json).
