[Wurk API](../README.md) / Cli

# Class: Cli\<TResult, TName\>

CLI definition.

## Type parameters

| Name | Type |
| :------ | :------ |
| `TResult` | extends `UnknownCliResult` = `UnknownCliResult` |
| `TName` | extends `string` = `string` |

## Table of contents

### Methods

- [action](Cli.md#action)
- [alias](Cli.md#alias)
- [command](Cli.md#command)
- [description](Cli.md#description)
- [getHelpText](Cli.md#gethelptext)
- [name](Cli.md#name)
- [option](Cli.md#option)
- [optionAction](Cli.md#optionaction)
- [optionConflict](Cli.md#optionconflict)
- [optionDefault](Cli.md#optiondefault)
- [optionHelp](Cli.md#optionhelp)
- [optionNegation](Cli.md#optionnegation)
- [optionVersion](Cli.md#optionversion)
- [parse](Cli.md#parse)
- [printHelp](Cli.md#printhelp)
- [setCommandOptional](Cli.md#setcommandoptional)
- [setDefault](Cli.md#setdefault)
- [setExitOnError](Cli.md#setexitonerror)
- [setHelpFormatter](Cli.md#sethelpformatter)
- [setHidden](Cli.md#sethidden)
- [setUnknownNamedOptionAllowed](Cli.md#setunknownnamedoptionallowed)
- [trailer](Cli.md#trailer)
- [version](Cli.md#version)
- [create](Cli.md#create)

## Methods

### action

▸ **action**(`callback`): [`Cli`](Cli.md)\<`TResult`, `TName`\>

Define an action to run after all command line arguments have been
parsed. Multiple actions will be run in the order they are defined.

A "cleanup" callback can be returned which will be run after all command
actions. Cleanup callbacks run in the reverse order they are defined.

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | [`CliAction`](../README.md#cliaction)\<`TResult`\> |

#### Returns

[`Cli`](Cli.md)\<`TResult`, `TName`\>

___

### alias

▸ **alias**\<`TAlias`\>(`...aliases`): [`Cli`](Cli.md)\<`TResult`, `TName`\>

Add one or more aliases to the command.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TAlias` | extends `string` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `...aliases` | `TAlias`[] |

#### Returns

[`Cli`](Cli.md)\<`TResult`, `TName`\>

___

### command

▸ **command**\<`TCommandName`, `TCommandResult`\>(`command`): [`Cli`](Cli.md)\<[`CliResult`](../interfaces/CliResult.md)\<`InferCliResultOptions`\<`TResult`\>, `UnionProps`\<`InferCliResultCommand`\<`TResult`\>, `Record`\<`TCommandName`, `undefined` \| `TCommandResult`\>\>\>, `TName`\>

Add a command.

NOTE: Commands must match _BEFORE_ any positional options are parsed.
This means that commands are incompatible with required positional
options, and no non-required positional options will be parsed by the
current command if a command is matched.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TCommandName` | extends `string` |
| `TCommandResult` | extends `UnknownCliResult` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `command` | [`Cli`](Cli.md)\<`TCommandResult`, `TCommandName`\> |

#### Returns

[`Cli`](Cli.md)\<[`CliResult`](../interfaces/CliResult.md)\<`InferCliResultOptions`\<`TResult`\>, `UnionProps`\<`InferCliResultCommand`\<`TResult`\>, `Record`\<`TCommandName`, `undefined` \| `TCommandResult`\>\>\>, `TName`\>

___

### description

▸ **description**(`description`): [`Cli`](Cli.md)\<`TResult`, `TName`\>

Add a paragraph to the start of the command help text.

#### Parameters

| Name | Type |
| :------ | :------ |
| `description` | `undefined` \| ``null`` \| `string` \| ``false`` \| ``0`` \| `0n` |

#### Returns

[`Cli`](Cli.md)\<`TResult`, `TName`\>

___

### getHelpText

▸ **getHelpText**(`error?`): `string`

Return the help text for this command.

#### Parameters

| Name | Type |
| :------ | :------ |
| `error?` | `unknown` |

#### Returns

`string`

___

### name

▸ **name**\<`TNewName`\>(`name`): [`Cli`](Cli.md)\<`TResult`, `TNewName`\>

Change the CLI/command name.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TNewName` | extends `string` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `TNewName` |

#### Returns

[`Cli`](Cli.md)\<`TResult`, `TNewName`\>

▸ **name**(): `TName`

Get the CLI/command name.

#### Returns

`TName`

___

### option

▸ **option**\<`TUsage`, `TKey`, `TRequired`, `TMapped`, `TValue`, `TParsedValue`\>(`usage`, `config?`): [`Cli`](Cli.md)\<`TKey` extends `string` ? [`CliResult`](../interfaces/CliResult.md)\<`UnionProps`\<`InferCliResultOptions`\<`TResult`\>, `Record`\<`TKey`, `TParsedValue` \| `TRequired` extends ``true`` ? `never` : `undefined`\>\>, `InferCliResultCommand`\<`TResult`\>\> : `TResult`, `TName`\>

Define a named option.

- Must begin with a hyphen followed by a name (eg. `-a` or `--abc`).
  - Names cannot contain whitespace or the following reserved characters: `=,|.<>[]`
- Aliases can be separating a comma or pipe (eg. `-a, --abc` or `-a | --abc`).
- The last alias may be followed by a "positional" value placeholder
  (eg. `--option <value>` or `--option=<value>`).
- The option key defaults to the last alias converted to camel case (eg. `-f, --foo-bar` becomes `fooBar`).

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TUsage` | extends \`-$\{string}\` |
| `TKey` | extends ``null`` \| `string` = `InferNamedKey`\<`TUsage`\> |
| `TRequired` | extends `boolean` = ``false`` |
| `TMapped` | extends `boolean` = ``false`` |
| `TValue` | `TMapped` extends ``true`` ? `Record`\<`string`, `InferNamedArgType`\<`TUsage`\>\> : `InferNamedArgType`\<`TUsage`\> |
| `TParsedValue` | `TMapped` extends ``true`` ? `Record`\<`string`, `InferNamedResultType`\<`TUsage`\>\> : `InferNamedResultType`\<`TUsage`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `usage` | `TUsage` |
| `config?` | `string` \| `NamedConfig`\<`TKey`, `TValue`, `TParsedValue`, `TRequired`, `TMapped`, `TResult`\> |

#### Returns

[`Cli`](Cli.md)\<`TKey` extends `string` ? [`CliResult`](../interfaces/CliResult.md)\<`UnionProps`\<`InferCliResultOptions`\<`TResult`\>, `Record`\<`TKey`, `TParsedValue` \| `TRequired` extends ``true`` ? `never` : `undefined`\>\>, `InferCliResultCommand`\<`TResult`\>\> : `TResult`, `TName`\>

▸ **option**\<`TUsage`, `TKey`, `TRequired`, `TValue`, `TParsedValue`\>(`usage`, `config?`): [`Cli`](Cli.md)\<`TKey` extends `string` ? [`CliResult`](../interfaces/CliResult.md)\<`UnionProps`\<`InferCliResultOptions`\<`TResult`\>, `Record`\<`TKey`, `TParsedValue` \| `TRequired` extends ``true`` ? `never` : `undefined`\>\>, `InferCliResultCommand`\<`TResult`\>\> : `TResult`, `TName`\>

Define a positional option.

- Must be wrapped in angle brackets (`<value>`) for required or square brackets (`[value]`) for non-required.
- Names cannot contain whitespace or the following reserved characters: `=,|.<>[]`
- Names may be followed by a trailing ellipsis to indicate a variadic option (eg. `<value...>` or `[value...]`).
- The option key defaults to the name (with ellipses removed) converted to camel case
  (eg. `<foo-bar...>` becomes `fooBar`).

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TUsage` | extends `PositionalUsageString` |
| `TKey` | extends ``null`` \| `string` = `InferPositionalKey`\<`TUsage`\> |
| `TRequired` | extends `boolean` = `InferPositionalRequired`\<`TUsage`\> |
| `TValue` | `InferPositionalType`\<`TUsage`\> |
| `TParsedValue` | `InferPositionalType`\<`TUsage`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `usage` | `TUsage` |
| `config?` | `string` \| `PositionalConfig`\<`TKey`, `TValue`, `TParsedValue`, `TResult`\> |

#### Returns

[`Cli`](Cli.md)\<`TKey` extends `string` ? [`CliResult`](../interfaces/CliResult.md)\<`UnionProps`\<`InferCliResultOptions`\<`TResult`\>, `Record`\<`TKey`, `TParsedValue` \| `TRequired` extends ``true`` ? `never` : `undefined`\>\>, `InferCliResultCommand`\<`TResult`\>\> : `TResult`, `TName`\>

___

### optionAction

▸ **optionAction**\<`TKey`\>(`key`, `callback`): [`Cli`](Cli.md)\<`TResult`, `TName`\>

Define an action to run each time a specific option is parsed.
Multiple actions will be run in the order they are defined.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TKey` | extends `string` \| `number` \| `symbol` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `TKey` |
| `callback` | [`CliOptionAction`](../README.md#clioptionaction)\<`TResult`, `TKey`\> |

#### Returns

[`Cli`](Cli.md)\<`TResult`, `TName`\>

___

### optionConflict

▸ **optionConflict**\<`TKey0`, `TKey1`, `TKeyN`\>(`...keys`): [`Cli`](Cli.md)\<`TResult`, `TName`\>

Treat two or more options as conflicting with each other. If one of the
option is parsed, all others will fail when parsed.

NOTE: All options must be non-required, and only one of them can be
positional.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TKey0` | extends `string` \| `number` \| `symbol` |
| `TKey1` | extends `string` \| `number` \| `symbol` |
| `TKeyN` | extends `Exclude`\<keyof `PickOptional`\<`InferCliResultOptions`\<`TResult`\>\>, `TKey0` \| `TKey1`\>[] |

#### Parameters

| Name | Type |
| :------ | :------ |
| `...keys` | [key0: TKey0, key1: TKey1, ...keyN: TKeyN[]] |

#### Returns

[`Cli`](Cli.md)\<`TResult`, `TName`\>

___

### optionDefault

▸ **optionDefault**\<`TKey`\>(`key`, `factory`): [`Cli`](Cli.md)\<[`CliResult`](../interfaces/CliResult.md)\<`UnionProps`\<`Omit`\<`InferCliResultOptions`\<`TResult`\>, `TKey`\>, `Record`\<`TKey`, `Exclude`\<`InferCliResultOptions`\<`TResult`\>[`TKey`], `undefined`\>\>\>, `InferCliResultCommand`\<`TResult`\>\>, `TName`\>

Provide a default value for a non-required option.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TKey` | extends `string` \| `number` \| `symbol` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `TKey` |
| `factory` | `Extract`\<`InferCliResultOptions`\<`TResult`\>[`TKey`], ``null`` \| `string` \| `number` \| `bigint` \| `boolean`\> \| () => `Exclude`\<`InferCliResultOptions`\<`TResult`\>[`TKey`], `undefined`\> \| `Promise`\<`Exclude`\<`InferCliResultOptions`\<`TResult`\>[`TKey`], `undefined`\>\> |

#### Returns

[`Cli`](Cli.md)\<[`CliResult`](../interfaces/CliResult.md)\<`UnionProps`\<`Omit`\<`InferCliResultOptions`\<`TResult`\>, `TKey`\>, `Record`\<`TKey`, `Exclude`\<`InferCliResultOptions`\<`TResult`\>[`TKey`], `undefined`\>\>\>, `InferCliResultCommand`\<`TResult`\>\>, `TName`\>

___

### optionHelp

▸ **optionHelp**(`usage?`, `config?`): [`Cli`](Cli.md)\<`TResult`, `TName`\>

Set an option which will print the help text for the command and exit
the process. Set to `null` to remove a previously defined help option.

NOTE: Setting this option replaces the previously defined help option.

#### Parameters

| Name | Type |
| :------ | :------ |
| `usage?` | ``null`` \| \`-$\{string}\` |
| `config?` | `string` \| `Omit`\<`AnyNamedConfig`, ``"key"`` \| ``"required"`` \| ``"mapped"`` \| ``"parse"`` \| ``"meta"``\> |

#### Returns

[`Cli`](Cli.md)\<`TResult`, `TName`\>

___

### optionNegation

▸ **optionNegation**\<`TKey0`, `TKey1`, `TKeyN`\>(`...keys`): [`Cli`](Cli.md)\<[`CliResult`](../interfaces/CliResult.md)\<`UnionProps`\<`Omit`\<`InferCliResultOptions`\<`TResult`\>, `TKey0` \| `TKey1` \| `TKeyN`[`number`]\>, `Record`\<`TKey0` \| `TKey1` \| `TKeyN`[`number`], `boolean` \| keyof `PickRequired`\<`InferCliResultOptions`\<`TResult`\>\> extends `never` ? `undefined` : `never`\>\>, `InferCliResultCommand`\<`TResult`\>\>, `TName`\>

Treat two or more boolean options as negating each other. When one of the
options is set, all others will be set to `false`.

If any of the options are required, setting a negating option will fulfil
the requirement.

NOTE: All options must be boolean typed.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TKey0` | extends `string` \| `number` \| `symbol` |
| `TKey1` | extends `string` \| `number` \| `symbol` |
| `TKeyN` | extends `Exclude`\<keyof `PickByType`\<`InferCliResultOptions`\<`TResult`\>, `boolean`\>, `TKey0` \| `TKey1`\>[] |

#### Parameters

| Name | Type |
| :------ | :------ |
| `...keys` | [key0: TKey0, key1: TKey1, ...keyN: UniqueTuple\<TKeyN\>[]] |

#### Returns

[`Cli`](Cli.md)\<[`CliResult`](../interfaces/CliResult.md)\<`UnionProps`\<`Omit`\<`InferCliResultOptions`\<`TResult`\>, `TKey0` \| `TKey1` \| `TKeyN`[`number`]\>, `Record`\<`TKey0` \| `TKey1` \| `TKeyN`[`number`], `boolean` \| keyof `PickRequired`\<`InferCliResultOptions`\<`TResult`\>\> extends `never` ? `undefined` : `never`\>\>, `InferCliResultCommand`\<`TResult`\>\>, `TName`\>

___

### optionVersion

▸ **optionVersion**(`usage?`, `config?`): [`Cli`](Cli.md)\<`TResult`, `TName`\>

Set an option which will print the command version number and exit the
process. Set to `null` to remove a previously defined version option.

NOTE: Setting this option replaces the previously defined version option.

#### Parameters

| Name | Type |
| :------ | :------ |
| `usage?` | ``null`` \| \`-$\{string}\` |
| `config?` | `string` \| `Omit`\<`AnyNamedConfig`, ``"key"`` \| ``"required"`` \| ``"mapped"`` \| ``"parse"`` \| ``"meta"``\> |

#### Returns

[`Cli`](Cli.md)\<`TResult`, `TName`\>

___

### parse

▸ **parse**(`args?`): `Promise`\<`TResult`\>

Parse command line arguments and run command actions.

If `args` are not explicitly provided, `process.argv.slice(2)` is
used. Any extra leading arguments must be removed when explicitly
providing `args`.

#### Parameters

| Name | Type |
| :------ | :------ |
| `args?` | readonly `string`[] |

#### Returns

`Promise`\<`TResult`\>

___

### printHelp

▸ **printHelp**(`error?`): `void`

Print the help text for this command.

NOTE: Output is written to STDOUT if `error` is falsy, otherwise it
is written to STDERR.

#### Parameters

| Name | Type |
| :------ | :------ |
| `error?` | `unknown` |

#### Returns

`void`

___

### setCommandOptional

▸ **setCommandOptional**(`value?`): [`Cli`](Cli.md)\<`TResult`, `TName`\>

Do not fail parsing if no command is matched.

NOTE: This has no effect if no commands are defined or if there is a
default command.

#### Parameters

| Name | Type |
| :------ | :------ |
| `value?` | `boolean` |

#### Returns

[`Cli`](Cli.md)\<`TResult`, `TName`\>

___

### setDefault

▸ **setDefault**(`value?`): [`Cli`](Cli.md)\<`TResult`, `TName`\>

Use this command when no other commands are matched.

#### Parameters

| Name | Type |
| :------ | :------ |
| `value?` | `boolean` |

#### Returns

[`Cli`](Cli.md)\<`TResult`, `TName`\>

___

### setExitOnError

▸ **setExitOnError**(`value?`): [`Cli`](Cli.md)\<`TResult`, `TName`\>

Exit the process with a non-zero status code if an error occurs while
parsing or executing an action.

NOTE: If set to `true`, help text is printed for parsing errors, and the
stringified error is always printed.

#### Parameters

| Name | Type |
| :------ | :------ |
| `value?` | `boolean` |

#### Returns

[`Cli`](Cli.md)\<`TResult`, `TName`\>

___

### setHelpFormatter

▸ **setHelpFormatter**(`value`): [`Cli`](Cli.md)\<`TResult`, `TName`\>

Set a custom help text formatter.

NOTE: Commands inherit the help text formatter of their parent unless a
custom formatter is (or was) explicitly set on the command.

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | ``null`` \| [`CliHelpFormatter`](../interfaces/CliHelpFormatter.md) |

#### Returns

[`Cli`](Cli.md)\<`TResult`, `TName`\>

___

### setHidden

▸ **setHidden**(`value?`): [`Cli`](Cli.md)\<`TResult`, `TName`\>

Hide this command in parent command help text.

#### Parameters

| Name | Type |
| :------ | :------ |
| `value?` | `boolean` |

#### Returns

[`Cli`](Cli.md)\<`TResult`, `TName`\>

___

### setUnknownNamedOptionAllowed

▸ **setUnknownNamedOptionAllowed**(`value?`): [`Cli`](Cli.md)\<`TResult`, `TName`\>

Allow unknown named options to be treated as positional options.

NOTE: An unknown named option may still fail if it does not match a
defined positional option. To avoid this, define a variadic
positional option (eg. `<extra...>`) to capture any unknown named
options.

#### Parameters

| Name | Type |
| :------ | :------ |
| `value?` | `boolean` |

#### Returns

[`Cli`](Cli.md)\<`TResult`, `TName`\>

___

### trailer

▸ **trailer**(`trailer`): [`Cli`](Cli.md)\<`TResult`, `TName`\>

Add a paragraph to the end of the command help text.

#### Parameters

| Name | Type |
| :------ | :------ |
| `trailer` | `undefined` \| ``null`` \| `string` \| ``false`` \| ``0`` \| `0n` |

#### Returns

[`Cli`](Cli.md)\<`TResult`, `TName`\>

___

### version

▸ **version**(`version`): [`Cli`](Cli.md)\<`TResult`, `TName`\>

Set the command version number.

NOTE: This will also add default options for displaying the version
number (ie. `-v, --version`) if no explicit version has been set using
the `versionOption()` method, and no other options conflict with the `-v`
or `--version` option names.

#### Parameters

| Name | Type |
| :------ | :------ |
| `version` | `undefined` \| ``null`` \| `string` \| ``false`` \| ``0`` \| `0n` |

#### Returns

[`Cli`](Cli.md)\<`TResult`, `TName`\>

___

### create

▸ **create**\<`TName`\>(`name`): [`Cli`](Cli.md)\<[`CliResult`](../interfaces/CliResult.md)\<{}, {}\>, `TName`\>

Define a new command line interface.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TName` | extends `string` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `TName` |

#### Returns

[`Cli`](Cli.md)\<[`CliResult`](../interfaces/CliResult.md)\<{}, {}\>, `TName`\>
