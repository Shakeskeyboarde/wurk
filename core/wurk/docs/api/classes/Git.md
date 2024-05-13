[**Wurk API**](../README.md) • **Docs**

***

[Wurk API](../README.md) / Git

# Class: Git

Git repository informational utilities (readonly).

## Constructors

### new Git()

> `protected` **new Git**(`options`): [`Git`](Git.md)

Create a new Git instance.

#### Parameters

• **options**: [`GitOptions`](../interfaces/GitOptions.md)

#### Returns

[`Git`](Git.md)

## Methods

### create()

> `static` **create**(`options`): `Promise`\<[`Git`](Git.md)\>

Get a Git API instance.

Throws:
- If Git is not installed (ENOENT)
- If the directory is not a repo (ENOREPO)

#### Parameters

• **options**: [`GitOptions`](../interfaces/GitOptions.md)

#### Returns

`Promise`\<[`Git`](Git.md)\>

## Properties

### getHead()

> `readonly` **getHead**: (`dir`, `options`?) => `Promise`\<`null` \| `string`\>

Get the hash of the most recent commit which modified the directory. This
may not actually be HEAD if the directory was not modified in the current
HEAD commit.

#### Parameters

• **dir**: `string`

• **options?**: [`GitHeadOptions`](../interfaces/GitHeadOptions.md)

#### Returns

`Promise`\<`null` \| `string`\>

***

### getIgnored()

> `readonly` **getIgnored**: (`dir`) => `Promise`\<`string`[]\>

Get a list of all the files in the directory which are ignored by Git
(`.gitignore`).

#### Parameters

• **dir**: `string`

#### Returns

`Promise`\<`string`[]\>

***

### getIsDirty()

> `readonly` **getIsDirty**: (`dir`) => `Promise`\<`boolean`\>

Return true if the Git working tree is dirty.

#### Parameters

• **dir**: `string`

#### Returns

`Promise`\<`boolean`\>

***

### getIsShallow()

> `readonly` **getIsShallow**: () => `Promise`\<`boolean`\>

Return true if the instance directory is a shallow Git clone.

#### Returns

`Promise`\<`boolean`\>

***

### getLogs()

> `readonly` **getLogs**: (`dir`, `options`?) => `Promise`\<[`GitLog`](../interfaces/GitLog.md)[]\>

Get Git log entries.

**Note:** This method will throw an error if the directory is part of a
shallow Git clone.

#### Parameters

• **dir**: `string`

• **options?**: [`GitLogOptions`](../interfaces/GitLogOptions.md)

#### Returns

`Promise`\<[`GitLog`](../interfaces/GitLog.md)[]\>

***

### getRoot()

> `readonly` **getRoot**: () => `Promise`\<`string`\>

Return the root directory of the Git repository.

#### Returns

`Promise`\<`string`\>
