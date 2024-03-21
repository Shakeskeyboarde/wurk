[Wurk API](../README.md) / HelpCli

# Interface: HelpCli

The `Cli` definition to be formatted.

## Table of contents

### Properties

- [aliases](HelpCli.md#aliases)
- [commands](HelpCli.md#commands)
- [descriptions](HelpCli.md#descriptions)
- [isCommandOptional](HelpCli.md#iscommandoptional)
- [isDefault](HelpCli.md#isdefault)
- [isHidden](HelpCli.md#ishidden)
- [name](HelpCli.md#name)
- [options](HelpCli.md#options)
- [parent](HelpCli.md#parent)
- [trailers](HelpCli.md#trailers)

## Properties

### aliases

• `Readonly` **aliases**: readonly `string`[]

Aliases for the command.

___

### commands

• `Readonly` **commands**: readonly [`HelpCli`](HelpCli.md)[]

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

• `Readonly` **parent**: ``null`` \| [`HelpCli`](HelpCli.md)

Parent command, if any.

___

### trailers

• `Readonly` **trailers**: readonly `string`[]

Trailers for the command.
