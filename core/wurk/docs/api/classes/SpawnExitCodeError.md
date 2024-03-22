[Wurk API](../README.md) / SpawnExitCodeError

# Class: SpawnExitCodeError

Error thrown when a spawned process exits with a non-zero status.

## Hierarchy

- `Error`

  ↳ **`SpawnExitCodeError`**

## Table of contents

### Constructors

- [constructor](SpawnExitCodeError.md#constructor)

### Methods

- [captureStackTrace](SpawnExitCodeError.md#capturestacktrace)

### Properties

- [exitCode](SpawnExitCodeError.md#exitcode)
- [signalCode](SpawnExitCodeError.md#signalcode)
- [prepareStackTrace](SpawnExitCodeError.md#preparestacktrace)

## Constructors

### constructor

• **new SpawnExitCodeError**(`cmd`, `exitCode`, `signalCode`): [`SpawnExitCodeError`](SpawnExitCodeError.md)

Create a new `SpawnExitCodeError`.

#### Parameters

| Name | Type |
| :------ | :------ |
| `cmd` | `string` |
| `exitCode` | `number` |
| `signalCode` | ``null`` \| `Signals` |

#### Returns

[`SpawnExitCodeError`](SpawnExitCodeError.md)

#### Overrides

Error.constructor

## Methods

### captureStackTrace

▸ **captureStackTrace**(`targetObject`, `constructorOpt?`): `void`

Create .stack property on a target object

#### Parameters

| Name | Type |
| :------ | :------ |
| `targetObject` | `object` |
| `constructorOpt?` | `Function` |

#### Returns

`void`

#### Inherited from

Error.captureStackTrace

## Properties

### exitCode

• `Readonly` **exitCode**: `number`

The exit code of the process.

___

### signalCode

• `Readonly` **signalCode**: ``null`` \| `Signals`

The signal code of the process, if it was killed by a signal.

___

### prepareStackTrace

▪ `Static` `Optional` **prepareStackTrace**: (`err`: `Error`, `stackTraces`: `CallSite`[]) => `any`

Optional override for formatting stack traces

**`See`**

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

#### Type declaration

▸ (`err`, `stackTraces`): `any`

##### Parameters

| Name | Type |
| :------ | :------ |
| `err` | `Error` |
| `stackTraces` | `CallSite`[] |

##### Returns

`any`

#### Inherited from

Error.prepareStackTrace
