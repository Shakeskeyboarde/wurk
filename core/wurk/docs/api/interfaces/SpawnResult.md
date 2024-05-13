[**Wurk API**](../README.md) • **Docs**

***

[Wurk API](../README.md) / SpawnResult

# Interface: SpawnResult

Result of spawning a child process.

## Properties

### combined

> `readonly` **combined**: `Buffer`

The combined buffered output of the process.

***

### combinedText

> `readonly` **combinedText**: `string`

The combined buffered output of the process as a UTF-8 string.

***

### exitCode

> `readonly` **exitCode**: `number`

The exit code of the process.

***

### ok

> `readonly` **ok**: `boolean`

Convenience property which is true if the process exited with a zero
[exitCode](SpawnResult.md#exitcode).

***

### signalCode

> `readonly` **signalCode**: `null` \| `Signals`

The signal code of the process, if it was killed by a signal.

***

### stderr

> `readonly` **stderr**: `Buffer`

The buffered stderr of the process.

***

### stderrJson

> `readonly` **stderrJson**: [`JsonAccessor`](../classes/JsonAccessor.md)

The buffered stderr of the process as a JSON decoded value.

***

### stderrText

> `readonly` **stderrText**: `string`

The buffered stderr of the process as a UTF-8 string.

***

### stdout

> `readonly` **stdout**: `Buffer`

The buffered stdout of the process.

***

### stdoutJson

> `readonly` **stdoutJson**: [`JsonAccessor`](../classes/JsonAccessor.md)

The buffered stdout of the process as a JSON decoded value.

***

### stdoutText

> `readonly` **stdoutText**: `string`

The buffered stdout of the process as a UTF-8 string.
