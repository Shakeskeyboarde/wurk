[Wurk API](../README.md) / CommandContext

# Class: CommandContext\<TResult\>

Context passed to Wurk command action hook.

## Type parameters

| Name | Type |
| :------ | :------ |
| `TResult` | extends `UnknownResult` |

## Implements

- `Result`\<`InferResultOptions`\<`TResult`\>, `InferResultCommand`\<`TResult`\>\>

## Table of contents

### Methods

- [createGit](CommandContext.md#creategit)

### Properties

- [log](CommandContext.md#log)
- [pm](CommandContext.md#pm)
- [workspaces](CommandContext.md#workspaces)

## Methods

### createGit

▸ **createGit**(): `Promise`\<`Git`\>

Create a Git API instance for the workspace directory.

Throws:
- If Git is not installed (ENOENT)
- If the directory is not a repo (ENOREPO)

#### Returns

`Promise`\<`Git`\>

## Properties

### log

• `Readonly` **log**: `Log`

Global logger for the command. This logger has no prefix unless one is
set by the command.

___

### pm

• `Readonly` **pm**: `PackageManager`

Package manager utilities.

___

### workspaces

• `Readonly` **workspaces**: [`WorkspaceCollection`](WorkspaceCollection.md)

Collection of all workspaces in the project.
