[Wurk API](../README.md) / CommandContext

# Class: CommandContext\<TResult\>

Context passed to Wurk command action hook.

## Type parameters

| Name | Type |
| :------ | :------ |
| `TResult` | extends `UnknownResult` |

## Implements

- [`Result`](../interfaces/Result.md)\<`InferResultOptions`\<`TResult`\>, `InferResultCommand`\<`TResult`\>\>

## Table of contents

### Accessors

- [commandResult](CommandContext.md#commandresult)
- [name](CommandContext.md#name)
- [options](CommandContext.md#options)
- [parsed](CommandContext.md#parsed)

### Constructors

- [constructor](CommandContext.md#constructor)

### Methods

- [createGit](CommandContext.md#creategit)
- [getHelpText](CommandContext.md#gethelptext)
- [printHelp](CommandContext.md#printhelp)

### Properties

- [log](CommandContext.md#log)
- [pm](CommandContext.md#pm)
- [root](CommandContext.md#root)
- [spawn](CommandContext.md#spawn)
- [workspaces](CommandContext.md#workspaces)

## Accessors

### commandResult

• `get` **commandResult**(): `InferResultCommand`\<`TResult`\>

Results of (sub-)command argument parsing and actions.

NOTE: This is a "dictionary" object which will have zero or one keys
defined, because only zero or one commands can be matched per parent
command.

#### Returns

`InferResultCommand`\<`TResult`\>

#### Implementation of

[Result](../interfaces/Result.md).[commandResult](../interfaces/Result.md#commandresult)

___

### name

• `get` **name**(): `string`

The name of the command.

#### Returns

`string`

#### Implementation of

[Result](../interfaces/Result.md).[name](../interfaces/Result.md#name)

___

### options

• `get` **options**(): `InferResultOptions`\<`TResult`\>

Options derived from argument parsing and actions.

#### Returns

`InferResultOptions`\<`TResult`\>

#### Implementation of

[Result](../interfaces/Result.md).[options](../interfaces/Result.md#options)

___

### parsed

• `get` **parsed**(): `ReadonlySet`\<`string`\>

Option keys which have been parsed from command line arguments.

NOTE: Options can also be set programmatically, which will NOT add them
to this set. This set can be used to validate combinations of options
used on the command line (eg. conflicts) without being affected by other
programmatic updates and side effects.

#### Returns

`ReadonlySet`\<`string`\>

#### Implementation of

[Result](../interfaces/Result.md).[parsed](../interfaces/Result.md#parsed)

## Constructors

### constructor

• **new CommandContext**\<`TResult`\>(`options`): [`CommandContext`](CommandContext.md)\<`TResult`\>

Create a new command context.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TResult` | extends `UnknownResult` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `ContextOptions`\<`TResult`\> |

#### Returns

[`CommandContext`](CommandContext.md)\<`TResult`\>

## Methods

### createGit

▸ **createGit**(): `Promise`\<`Git`\>

Create a Git API instance for the workspace directory.

Throws:
- If Git is not installed (ENOENT)
- If the directory is not a repo (ENOREPO)

#### Returns

`Promise`\<`Git`\>

___

### getHelpText

▸ **getHelpText**(`error?`): `string`

Get the help text of the command that produced this result.

#### Parameters

| Name | Type |
| :------ | :------ |
| `error?` | `unknown` |

#### Returns

`string`

#### Implementation of

[Result](../interfaces/Result.md).[getHelpText](../interfaces/Result.md#gethelptext)

___

### printHelp

▸ **printHelp**(`error?`): `void`

Print the help text of the command that produced this result.

#### Parameters

| Name | Type |
| :------ | :------ |
| `error?` | `unknown` |

#### Returns

`void`

#### Implementation of

[Result](../interfaces/Result.md).[printHelp](../interfaces/Result.md#printhelp)

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

### spawn

• `Readonly` **spawn**: (`cmd`: `string`, `sparseArgs?`: `SpawnSparseArgs`, ...`options`: `SpawnOptions`[]) => `Promise`\<`SpawnResult`\>

Spawn a child process relative to the root workspace directory.

#### Type declaration

▸ (`cmd`, `sparseArgs?`, `...options`): `Promise`\<`SpawnResult`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `cmd` | `string` |
| `sparseArgs?` | `SpawnSparseArgs` |
| `...options` | `SpawnOptions`[] |

##### Returns

`Promise`\<`SpawnResult`\>

___

### workspaces

• `Readonly` **workspaces**: [`Workspaces`](Workspaces.md)

Collection of all workspaces in the project.
