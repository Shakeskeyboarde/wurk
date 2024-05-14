[**Wurk API**](../README.md) • **Docs**

***

[Wurk API](../README.md) / CommandContextOptions

# Interface: CommandContextOptions\<TResult\>

Options for creating a new command context.

## Type parameters

• **TResult** *extends* `UnknownCliResult`

## Properties

### pm

> `readonly` **pm**: `string`

The package manager (command) in use (eg. `npm`, `pnpm`, `yarn`).

***

### result

> `readonly` **result**: `TResult`

Results parsed from command line arguments and actions.

***

### root

> `readonly` **root**: [`Workspace`](../classes/Workspace.md)

Root workspace of the project.

***

### workspaces

> `readonly` **workspaces**: [`Workspaces`](../classes/Workspaces.md)

Collection of all child workspaces in the project, not including the root.
