[Wurk Custom Commands](../README.md) / Context

# Class: Context\<TResult\>

Context passed to Wurk command action hooks.

## Type parameters

| Name | Type |
| :------ | :------ |
| `TResult` | extends `UnknownResult` |

## Implements

- `Result`\<`InferResultOptions`\<`TResult`\>, `InferResultCommand`\<`TResult`\>\>

## Table of contents

### Properties

- [autoPrintStatus](Context.md#autoprintstatus)
- [log](Context.md#log)
- [workspaces](Context.md#workspaces)

## Properties

### autoPrintStatus

• `Readonly` **autoPrintStatus**: (`enabled?`: `boolean`) => `void`

When enabled, a status summary for all workspaces will be printed after
the command completes, even if an error is thrown.

#### Type declaration

▸ (`enabled?`): `void`

When enabled, a status summary for all workspaces will be printed after
the command completes, even if an error is thrown.

##### Parameters

| Name | Type |
| :------ | :------ |
| `enabled?` | `boolean` |

##### Returns

`void`

___

### log

• `Readonly` **log**: `Log`

Global logger for the command. This logger has no prefix unless one is
set by the command.

___

### workspaces

• `Readonly` **workspaces**: `WorkspaceCollection`

Collection of all workspaces in the project.
