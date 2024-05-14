[**Wurk API**](../README.md) • **Docs**

***

[Wurk API](../README.md) / CommandContext

# Class: CommandContext\<TResult\>

Context passed to Wurk command action hook.

## Type parameters

• **TResult** *extends* `UnknownCliResult`

## Implements

- [`CliResult`](../interfaces/CliResult.md)\<`InferCliResultOptions`\<`TResult`\>, `InferCliResultCommand`\<`TResult`\>\>

## Accessors

### commandResult

> `get` **commandResult**(): `InferCliResultCommand`\<`TResult`\>

Results of (sub-)command argument parsing and actions.

NOTE: This is a "dictionary" object which will have zero or one keys
defined, because only zero or one commands can be matched per parent
command.

#### Returns

`InferCliResultCommand`\<`TResult`\>

***

### name

> `get` **name**(): `string`

The name of the command.

#### Returns

`string`

***

### options

> `get` **options**(): `InferCliResultOptions`\<`TResult`\>

Options derived from argument parsing and actions.

#### Returns

`InferCliResultOptions`\<`TResult`\>

***

### parsed

> `get` **parsed**(): `ReadonlySet`\<`string`\>

Option keys which have been parsed from command line arguments.

NOTE: Options can also be set programmatically, which will NOT add them
to this set. This set can be used to validate combinations of options
used on the command line (eg. conflicts) without being affected by other
programmatic updates and side effects.

#### Returns

`ReadonlySet`\<`string`\>

## Constructors

### new CommandContext()

> **new CommandContext**\<`TResult`\>(`options`): [`CommandContext`](CommandContext.md)\<`TResult`\>

Create a new command context.

#### Parameters

• **options**: [`CommandContextOptions`](../interfaces/CommandContextOptions.md)\<`TResult`\>

#### Returns

[`CommandContext`](CommandContext.md)\<`TResult`\>

## Methods

### createGit()

> `readonly` **createGit**(): `Promise`\<[`Git`](Git.md)\>

Create a Git API instance for the workspace directory.

Throws:
- If Git is not installed (ENOENT)
- If the directory is not a repo (ENOREPO)

#### Returns

`Promise`\<[`Git`](Git.md)\>

***

### getHelpText()

> `readonly` **getHelpText**(`error`?): `string`

Get the help text of the command that produced this result.

#### Parameters

• **error?**: `unknown`

#### Returns

`string`

#### Implementation of

[`CliResult`](../interfaces/CliResult.md).[`getHelpText`](../interfaces/CliResult.md#gethelptext)

***

### printHelp()

> `readonly` **printHelp**(`error`?): `void`

Print the help text of the command that produced this result.

#### Parameters

• **error?**: `unknown`

#### Returns

`void`

#### Implementation of

[`CliResult`](../interfaces/CliResult.md).[`printHelp`](../interfaces/CliResult.md#printhelp)

## Properties

### log

> `readonly` **log**: [`Log`](Log.md)

Global logger for the command. This logger has no prefix unless one is
set by the command.

***

### pm

> `readonly` **pm**: `string`

The package manager in use. This should be one of: `npm`, `pnpm`, or
`yarn`. Additional package managers may be supported in the future.

***

### root

> `readonly` **root**: [`Workspace`](Workspace.md)

The root workspace of the project.

***

### spawn()

> `readonly` **spawn**: (`cmd`, `sparseArgs`?, ...`options`) => `Promise`\<[`SpawnResult`](../interfaces/SpawnResult.md)\>

Spawn a child process relative to the root workspace directory.

#### Parameters

• **cmd**: `string`

• **sparseArgs?**: `SpawnSparseArgs`

• ...**options?**: [`SpawnOptions`](../interfaces/SpawnOptions.md)[]

#### Returns

`Promise`\<[`SpawnResult`](../interfaces/SpawnResult.md)\>

***

### workspaces

> `readonly` **workspaces**: [`Workspaces`](Workspaces.md)

Collection of all child workspaces in the project. Does not include the
root workspace.
