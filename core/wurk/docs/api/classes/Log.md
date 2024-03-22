[Wurk API](../README.md) / Log

# Class: Log

A simple logger with global level, prefixing, and streams.

## Table of contents

### Accessors

- [prefix](Log.md#prefix)
- [prefixStyle](Log.md#prefixstyle)

### Constructors

- [constructor](Log.md#constructor)

### Properties

- [\_print](Log.md#_print)
- [clone](Log.md#clone)
- [debug](Log.md#debug)
- [error](Log.md#error)
- [flush](Log.md#flush)
- [info](Log.md#info)
- [notice](Log.md#notice)
- [print](Log.md#print)
- [silly](Log.md#silly)
- [stderr](Log.md#stderr)
- [stdout](Log.md#stdout)
- [sub](Log.md#sub)
- [trace](Log.md#trace)
- [verbose](Log.md#verbose)
- [warn](Log.md#warn)

## Accessors

### prefix

• `get` **prefix**(): `string`

Get the unstyled prefix string.

#### Returns

`string`

• `set` **prefix**(`value`): `void`

Set the unstyled prefix string. This will also update the styled prefix.

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `string` |

#### Returns

`void`

___

### prefixStyle

• `get` **prefixStyle**(): `string`

Get the prefix style string. This is a prefix for the prefix which is
allowed to contain ANSI color and style codes.

#### Returns

`string`

• `set` **prefixStyle**(`value`): `void`

Set the prefix style string. This will also update the styled prefix.
This is a prefix for the prefix which is allowed to contain ANSI color
and style codes.

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `string` |

#### Returns

`void`

## Constructors

### constructor

• **new Log**(`options?`): [`Log`](Log.md)

Create a new log instance with the given options.

#### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | `LogOptions` |

#### Returns

[`Log`](Log.md)

## Properties

### \_print

• `Protected` `Readonly` **\_print**: (`to`: ``"stderr"`` \| ``"stdout"``, `level`: `LogLevel`, `value`: `unknown`, `options?`: `LogPrintOptions`) => `void`

_This method is intended for internal use._

All logged and streamed data is passed through this method.

#### Type declaration

▸ (`to`, `level`, `value`, `options?`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `to` | ``"stderr"`` \| ``"stdout"`` |
| `level` | `LogLevel` |
| `value` | `unknown` |
| `options?` | `LogPrintOptions` |

##### Returns

`void`

___

### clone

• `Readonly` **clone**: (`overrides?`: `LogOptions`) => [`Log`](Log.md)

Create a new log instance which inherits options from the current
instance.

#### Type declaration

▸ (`overrides?`): [`Log`](Log.md)

##### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `LogOptions` |

##### Returns

[`Log`](Log.md)

___

### debug

• `Readonly` **debug**: `LogFunction`

Alias for `verbose`.

___

### error

• `Readonly` **error**: `LogFunction`

Print a red message to stderr.

___

### flush

• `Readonly` **flush**: () => `void`

Call the flush methods on `this.stdout` and `this.stderr`.

#### Type declaration

▸ (): `void`

##### Returns

`void`

___

### info

• `Readonly` **info**: `LogFunction`

Print an uncolored message to stdout.

___

### notice

• `Readonly` **notice**: `LogFunction`

Print an uncolored message to stderr.

___

### print

• `Readonly` **print**: `LogFunction`

Print a message to stdout, regardless of log level.

___

### silly

• `Readonly` **silly**: `LogFunction`

Print a dimmed message to stderr.

___

### stderr

• `Readonly` **stderr**: `LogStream`

The standard error stream which cleans and prefixes streamed lines.

___

### stdout

• `Readonly` **stdout**: `LogStream`

The standard output stream which cleans and prefixes streamed lines.

___

### sub

• `Readonly` **sub**: (`suffix`: `undefined` \| ``null`` \| `string` \| `number` \| `boolean`) => [`Log`](Log.md)

Create a new log instance with a suffix appended to the prefix. If there
is no prefix, then the suffix becomes the entire prefix. If there is
already a prefix, then the suffix is appended as a subscript
(ie. `prefix[suffix]`). Blank, boolean, or nullish suffixes are ignored.

#### Type declaration

▸ (`suffix`): [`Log`](Log.md)

##### Parameters

| Name | Type |
| :------ | :------ |
| `suffix` | `undefined` \| ``null`` \| `string` \| `number` \| `boolean` |

##### Returns

[`Log`](Log.md)

___

### trace

• `Readonly` **trace**: `LogFunction`

Alias for `silly`.

___

### verbose

• `Readonly` **verbose**: `LogFunction`

Print a dimmed message to stderr.

___

### warn

• `Readonly` **warn**: `LogFunction`

Print a yellow message to stderr.
