[Wurk API](../README.md) / SpawnResult

# Interface: SpawnResult

Result of spawning a child process.

## Table of contents

### Properties

- [combined](SpawnResult.md#combined)
- [combinedText](SpawnResult.md#combinedtext)
- [exitCode](SpawnResult.md#exitcode)
- [ok](SpawnResult.md#ok)
- [signalCode](SpawnResult.md#signalcode)
- [stderr](SpawnResult.md#stderr)
- [stderrJson](SpawnResult.md#stderrjson)
- [stderrText](SpawnResult.md#stderrtext)
- [stdout](SpawnResult.md#stdout)
- [stdoutJson](SpawnResult.md#stdoutjson)
- [stdoutText](SpawnResult.md#stdouttext)

## Properties

### combined

• `Readonly` **combined**: `Buffer`

The combined buffered output of the process.

___

### combinedText

• `Readonly` **combinedText**: `string`

The combined buffered output of the process as a UTF-8 string.

___

### exitCode

• `Readonly` **exitCode**: `number`

The exit code of the process.

___

### ok

• `Readonly` **ok**: `boolean`

Convenience property which is true if the process exited with a zero
[exitCode](SpawnResult.md#exitcode).

___

### signalCode

• `Readonly` **signalCode**: ``null`` \| `Signals`

The signal code of the process, if it was killed by a signal.

___

### stderr

• `Readonly` **stderr**: `Buffer`

The buffered stderr of the process.

___

### stderrJson

• `Readonly` **stderrJson**: [`JsonAccessor`](../classes/JsonAccessor.md)

The buffered stderr of the process as a JSON decoded value.

___

### stderrText

• `Readonly` **stderrText**: `string`

The buffered stderr of the process as a UTF-8 string.

___

### stdout

• `Readonly` **stdout**: `Buffer`

The buffered stdout of the process.

___

### stdoutJson

• `Readonly` **stdoutJson**: [`JsonAccessor`](../classes/JsonAccessor.md)

The buffered stdout of the process as a JSON decoded value.

___

### stdoutText

• `Readonly` **stdoutText**: `string`

The buffered stdout of the process as a UTF-8 string.
