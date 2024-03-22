[Wurk API](../README.md) / CliHelpDefinition

# Interface: CliHelpDefinition

The `Cli` definition to be formatted.

## Table of contents

### Properties

- [aliases](CliHelpDefinition.md#aliases)
- [commands](CliHelpDefinition.md#commands)
- [descriptions](CliHelpDefinition.md#descriptions)
- [isCommandOptional](CliHelpDefinition.md#iscommandoptional)
- [isDefault](CliHelpDefinition.md#isdefault)
- [isHidden](CliHelpDefinition.md#ishidden)
- [name](CliHelpDefinition.md#name)
- [options](CliHelpDefinition.md#options)
- [parent](CliHelpDefinition.md#parent)
- [trailers](CliHelpDefinition.md#trailers)

## Properties

### aliases

• `Readonly` **aliases**: readonly `string`[]

Aliases for the command.

___

### commands

• `Readonly` **commands**: readonly [`CliHelpDefinition`](CliHelpDefinition.md)[]

Subcommands supported by the command.

___

### descriptions

• `Readonly` **descriptions**: readonly `string`[]

Descriptions for the command.

___

### isCommandOptional

• `Readonly` **isCommandOptional**: `boolean`

Whether a subcommand is optional.

___

### isDefault

• `Readonly` **isDefault**: `boolean`

Whether the command is the default subcommand of its parent.

___

### isHidden

• `Readonly` **isHidden**: `boolean`

Whether the command is hidden from parent help text.

___

### name

• `Readonly` **name**: `string`

The name of the command.

___

### options

• `Readonly` **options**: readonly (`Named` \| `Positional`)[]

Options supported by the command.

___

### parent

• `Readonly` **parent**: ``null`` \| [`CliHelpDefinition`](CliHelpDefinition.md)

Parent command, if any.

___

### trailers

• `Readonly` **trailers**: readonly `string`[]

Trailers for the command.
