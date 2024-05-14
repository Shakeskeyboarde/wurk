[**Wurk API**](../README.md) • **Docs**

***

[Wurk API](../README.md) / Log

# Class: Log

A simple logger with global level, prefixing, and streams.

## Accessors

### prefix

> `get` **prefix**(): `string`

Get the unstyled prefix string.

> `set` **prefix**(`value`): `void`

Set the unstyled prefix string. This will also update the styled prefix.

#### Parameters

• **value**: `string`

#### Returns

`string`

***

### prefixStyle

> `get` **prefixStyle**(): `string`

Get the prefix style string. This is a prefix for the prefix which is
allowed to contain ANSI color and style codes.

> `set` **prefixStyle**(`value`): `void`

Set the prefix style string. This will also update the styled prefix.
This is a prefix for the prefix which is allowed to contain ANSI color
and style codes.

#### Parameters

• **value**: `string`

#### Returns

`string`

## Constructors

### new Log()

> **new Log**(`options`?): [`Log`](Log.md)

Create a new log instance with the given options.

#### Parameters

• **options?**: `LogOptions`

#### Returns

[`Log`](Log.md)

## Properties

### \_print()

> `protected` `readonly` **\_print**: (`to`, `level`, `value`, `options`?) => `void`

_This method is intended for internal use._

All logged and streamed data is passed through this method.

#### Parameters

• **to**: `"stderr"` \| `"stdout"`

• **level**: `LogLevel`

• **value**: `unknown`

• **options?**: `LogPrintOptions`

#### Returns

`void`

***

### clone()

> `readonly` **clone**: (`overrides`?) => [`Log`](Log.md)

Create a new log instance which inherits options from the current
instance.

#### Parameters

• **overrides?**: `LogOptions`

#### Returns

[`Log`](Log.md)

***

### debug

> `readonly` **debug**: `LogFunction`

Alias for `verbose`.

***

### error

> `readonly` **error**: `LogFunction`

Print a red message to stderr.

***

### flush()

> `readonly` **flush**: () => `void`

Call the flush methods on `this.stdout` and `this.stderr`.

#### Returns

`void`

***

### info

> `readonly` **info**: `LogFunction`

Print an uncolored message to stdout.

***

### notice

> `readonly` **notice**: `LogFunction`

Print an uncolored message to stderr.

***

### print

> `readonly` **print**: `LogFunction`

Print a message to stdout, regardless of log level.

***

### silly

> `readonly` **silly**: `LogFunction`

Print a dimmed message to stderr.

***

### stderr

> `readonly` **stderr**: `LogStream`

The standard error stream which cleans and prefixes streamed lines.

***

### stdout

> `readonly` **stdout**: `LogStream`

The standard output stream which cleans and prefixes streamed lines.

***

### sub()

> `readonly` **sub**: (`suffix`) => [`Log`](Log.md)

Create a new log instance with a suffix appended to the prefix. If there
is no prefix, then the suffix becomes the entire prefix. If there is
already a prefix, then the suffix is appended as a subscript
(ie. `prefix[suffix]`). Blank, boolean, or nullish suffixes are ignored.

#### Parameters

• **suffix**: `undefined` \| `null` \| `string` \| `number` \| `boolean`

#### Returns

[`Log`](Log.md)

***

### trace

> `readonly` **trace**: `LogFunction`

Alias for `silly`.

***

### verbose

> `readonly` **verbose**: `LogFunction`

Print a dimmed message to stderr.

***

### warn

> `readonly` **warn**: `LogFunction`

Print a yellow message to stderr.
