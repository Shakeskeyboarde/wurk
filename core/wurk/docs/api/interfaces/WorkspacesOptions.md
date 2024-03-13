[Wurk API](../README.md) / WorkspacesOptions

# Interface: WorkspacesOptions

Workspace collection options.

## Table of contents

### Properties

- [concurrency](WorkspacesOptions.md#concurrency)
- [defaultIterationMethod](WorkspacesOptions.md#defaultiterationmethod)
- [getPublished](WorkspacesOptions.md#getpublished)
- [rootDir](WorkspacesOptions.md#rootdir)
- [workspaces](WorkspacesOptions.md#workspaces)

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

### getPublished

• `Optional` `Readonly` **getPublished**: (`name`: `string`, `version`: `string`) => `Promise`\<``null`` \| `WorkspacePublished`\>

Determine if a workspace version is published or not.

#### Type declaration

▸ (`name`, `version`): `Promise`\<``null`` \| `WorkspacePublished`\>

Determine if a workspace version is published or not.

##### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `version` | `string` |

##### Returns

`Promise`\<``null`` \| `WorkspacePublished`\>

___

### rootDir

• `Readonly` **rootDir**: `string`

The directory of the root workspace.

___

### workspaces

• `Optional` `Readonly` **workspaces**: readonly readonly [`string`, `JsonAccessor`][]

Array of workspace directories and configurations (package.json files).
