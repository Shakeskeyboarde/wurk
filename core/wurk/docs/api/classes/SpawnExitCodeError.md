[**Wurk API**](../README.md) • **Docs**

***

[Wurk API](../README.md) / SpawnExitCodeError

# Class: SpawnExitCodeError

Error thrown when a spawned process exits with a non-zero status.

## Extends

- `Error`

## Constructors

### new SpawnExitCodeError()

> **new SpawnExitCodeError**(`cmd`, `exitCode`, `signalCode`): [`SpawnExitCodeError`](SpawnExitCodeError.md)

Create a new `SpawnExitCodeError`.

#### Parameters

• **cmd**: `string`

• **exitCode**: `number`

• **signalCode**: `null` \| `Signals`

#### Returns

[`SpawnExitCodeError`](SpawnExitCodeError.md)

#### Overrides

`Error.constructor`

## Methods

### captureStackTrace()

> `static` **captureStackTrace**(`targetObject`, `constructorOpt`?): `void`

Create .stack property on a target object

#### Parameters

• **targetObject**: `object`

• **constructorOpt?**: `Function`

#### Returns

`void`

#### Inherited from

`Error.captureStackTrace`

## Properties

### exitCode

> `readonly` **exitCode**: `number`

The exit code of the process.

***

### signalCode

> `readonly` **signalCode**: `null` \| `Signals`

The signal code of the process, if it was killed by a signal.

***

### prepareStackTrace()?

> `static` `optional` **prepareStackTrace**: (`err`, `stackTraces`) => `any`

Optional override for formatting stack traces

#### See

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

#### Parameters

• **err**: `Error`

• **stackTraces**: `CallSite`[]

#### Returns

`any`

#### Inherited from

`Error.prepareStackTrace`
