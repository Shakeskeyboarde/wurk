[**Wurk API**](../README.md) • **Docs**

***

[Wurk API](../README.md) / SpawnOptions

# Interface: SpawnOptions

Options for spawning a child process.

## Properties

### allowNonZeroExitCode?

> `optional` `readonly` **allowNonZeroExitCode**: `boolean`

Do not throw an error if the child process exits with a non-zero status.

***

### cwd?

> `optional` `readonly` **cwd**: `string`

Current working directory of the child process.

***

### env?

> `optional` `readonly` **env**: `ProcessEnv`

Child process environment. This always extends the current `process.env`,
but variables can be omitted by setting them to `undefined`.

***

### input?

> `optional` `readonly` **input**: `Buffer`

Data to write to the child process stdin.

***

### log?

> `optional` `readonly` **log**: [`Log`](../classes/Log.md)

Logger to use for process logging.

***

### logCommand?

> `optional` `readonly` **logCommand**: `boolean` \| `object`

Print the command to the log before running it. Defaults to `true` if
the `output` option is `echo` or `inherit`, otherwise `false`.

***

### paths?

> `optional` `readonly` **paths**: readonly `string`[]

Child process PATH values to be appended to the current `process.env.PATH`
value.

***

### stdio?

> `optional` `readonly` **stdio**: `SpawnStdio`

Method of handling the child process input and output streams. Defaults
to `buffer` which stores stream output in memory and ignores stdin.

The input stream is only inherited if this is set to `inherit`, and the
`input` option is not set.
