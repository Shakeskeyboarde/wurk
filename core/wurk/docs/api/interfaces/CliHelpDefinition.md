[**Wurk API**](../README.md) • **Docs**

***

[Wurk API](../README.md) / CliHelpDefinition

# Interface: CliHelpDefinition

The `Cli` definition to be formatted.

## Properties

### aliases

> `readonly` **aliases**: readonly `string`[]

Aliases for the command.

***

### commands

> `readonly` **commands**: readonly [`CliHelpDefinition`](CliHelpDefinition.md)[]

Subcommands supported by the command.

***

### descriptions

> `readonly` **descriptions**: readonly `string`[]

Descriptions for the command.

***

### isCommandOptional

> `readonly` **isCommandOptional**: `boolean`

Whether a subcommand is optional.

***

### isDefault

> `readonly` **isDefault**: `boolean`

Whether the command is the default subcommand of its parent.

***

### isHidden

> `readonly` **isHidden**: `boolean`

Whether the command is hidden from parent help text.

***

### name

> `readonly` **name**: `string`

The name of the command.

***

### options

> `readonly` **options**: readonly (`Named` \| `Positional`)[]

Options supported by the command.

***

### parent

> `readonly` **parent**: `null` \| [`CliHelpDefinition`](CliHelpDefinition.md)

Parent command, if any.

***

### trailers

> `readonly` **trailers**: readonly `string`[]

Trailers for the command.
