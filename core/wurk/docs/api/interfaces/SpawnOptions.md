[Wurk API](../README.md) / SpawnOptions

# Interface: SpawnOptions

Options for spawning a child process.

## Table of contents

### Properties

- [allowNonZeroExitCode](SpawnOptions.md#allownonzeroexitcode)
- [cwd](SpawnOptions.md#cwd)
- [env](SpawnOptions.md#env)
- [input](SpawnOptions.md#input)
- [log](SpawnOptions.md#log)
- [logCommand](SpawnOptions.md#logcommand)
- [paths](SpawnOptions.md#paths)
- [stdio](SpawnOptions.md#stdio)

## Properties

### allowNonZeroExitCode

• `Optional` `Readonly` **allowNonZeroExitCode**: `boolean`

Do not throw an error if the child process exits with a non-zero status.

___

### cwd

• `Optional` `Readonly` **cwd**: `string`

Current working directory of the child process.

___

### env

• `Optional` `Readonly` **env**: `ProcessEnv`

Child process environment. This always extends the current `process.env`,
but variables can be omitted by setting them to `undefined`.

___

### input

• `Optional` `Readonly` **input**: `Buffer`

Data to write to the child process stdin.

___

### log

• `Optional` `Readonly` **log**: [`Log`](../classes/Log.md)

Logger to use for process logging.

___

### logCommand

• `Optional` `Readonly` **logCommand**: `boolean` \| \{ `mapArgs?`: (`arg`: `string`) => ``null`` \| `string` \| `boolean` \| `LiteralArg` \| (`string` \| `LiteralArg`)[]  }

Print the command to the log before running it. Defaults to `true` if
the `output` option is `echo` or `inherit`, otherwise `false`.

___

### paths

• `Optional` `Readonly` **paths**: readonly `string`[]

Child process PATH values to be appended to the current `process.env.PATH`
value.

___

### stdio

• `Optional` `Readonly` **stdio**: `SpawnStdio`

Method of handling the child process input and output streams. Defaults
to `buffer` which stores stream output in memory and ignores stdin.

The input stream is only inherited if this is set to `inherit`, and the
`input` option is not set.
