[**Wurk API**](../README.md) • **Docs**

***

[Wurk API](../README.md) / CliResult

# Interface: CliResult\<TOptions, TCommand\>

Result of CLI argument parsing and actions.

## Type parameters

• **TOptions** *extends* `Record`\<`string`, `unknown`\>

• **TCommand** *extends* `Record`\<`string`, `UnknownCliResult` \| `undefined`\>

## Methods

### getHelpText()

> **getHelpText**(`error`?): `string`

Get the help text of the CLI that produced this result.

#### Parameters

• **error?**: `unknown`

#### Returns

`string`

***

### printHelp()

> **printHelp**(`error`?): `void`

Print the help text of the CLI that produced this result.

#### Parameters

• **error?**: `unknown`

#### Returns

`void`

## Properties

### commandResult

> `readonly` **commandResult**: \{ readonly \[P in string \| number \| symbol\]: undefined \| TCommand\[P\] \}

Results of (sub-)command argument parsing and actions.

NOTE: This is a "dictionary" object which will have zero or one keys
defined, because only zero or one commands can be matched per parent
command.

***

### name

> **name**: `string`

Name or alias of the CLI that produced this result. If the CLI is used as
a (sub-)command, this will be the name or alias that was matched.

***

### options

> `readonly` **options**: `TOptions`

Options derived from argument parsing and actions.

***

### parsed

> `readonly` **parsed**: `ReadonlySet`\<`string`\>

Option keys which have been parsed from command line arguments.

NOTE: Options can also be set programmatically, which will _NOT_ add
them to this set. This set can be used to validate combinations of
options used on the command line (eg. conflicts) without being
affected by other programmatic updates and side effects.
