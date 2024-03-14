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
- [root](CommandContext.md#root)
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

• `Readonly` **pm**: `string`

The package manager in use. This should be one of: `npm`, `pnpm`, or
`yarn`. Additional package managers may be supported in the future.

___

### root

• `Readonly` **root**: [`Workspace`](Workspace.md)

The root workspace of the project.

___

### workspaces

• `Readonly` **workspaces**: [`Workspaces`](Workspaces.md)

Collection of all workspaces in the project.
