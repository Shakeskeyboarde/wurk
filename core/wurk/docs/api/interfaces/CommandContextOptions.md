[Wurk API](../README.md) / CommandContextOptions

# Interface: CommandContextOptions\<TResult\>

Options for creating a new command context.

## Type parameters

| Name | Type |
| :------ | :------ |
| `TResult` | extends `UnknownCliResult` |

## Table of contents

### Properties

- [pm](CommandContextOptions.md#pm)
- [result](CommandContextOptions.md#result)
- [root](CommandContextOptions.md#root)
- [workspaces](CommandContextOptions.md#workspaces)

## Properties

### pm

• `Readonly` **pm**: `string`

The package manager (command) in use (eg. `npm`, `pnpm`, `yarn`).

___

### result

• `Readonly` **result**: `TResult`

Results parsed from command line arguments and actions.

___

### root

• `Readonly` **root**: [`Workspace`](../classes/Workspace.md)

Root workspace of the project.

___

### workspaces

• `Readonly` **workspaces**: [`Workspaces`](../classes/Workspaces.md)

Collection of all child workspaces in the project, not including the root.
