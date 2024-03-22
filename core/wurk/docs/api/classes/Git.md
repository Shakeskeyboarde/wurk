[Wurk API](../README.md) / Git

# Class: Git

Git repository informational utilities (readonly).

## Table of contents

### Constructors

- [constructor](Git.md#constructor)

### Methods

- [create](Git.md#create)

### Properties

- [getHead](Git.md#gethead)
- [getIgnored](Git.md#getignored)
- [getIsDirty](Git.md#getisdirty)
- [getIsShallow](Git.md#getisshallow)
- [getLogs](Git.md#getlogs)
- [getRoot](Git.md#getroot)

## Constructors

### constructor

• **new Git**(`options`): [`Git`](Git.md)

Create a new Git instance.

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`GitOptions`](../interfaces/GitOptions.md) |

#### Returns

[`Git`](Git.md)

## Methods

### create

▸ **create**(`options`): `Promise`\<[`Git`](Git.md)\>

Get a Git API instance.

Throws:
- If Git is not installed (ENOENT)
- If the directory is not a repo (ENOREPO)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`GitOptions`](../interfaces/GitOptions.md) |

#### Returns

`Promise`\<[`Git`](Git.md)\>

## Properties

### getHead

• `Readonly` **getHead**: (`dir`: `string`, `options?`: [`GitHeadOptions`](../interfaces/GitHeadOptions.md)) => `Promise`\<``null`` \| `string`\>

Get the hash of the most recent commit which modified the directory. This
may not actually be HEAD if the directory was not modified in the current
HEAD commit.

#### Type declaration

▸ (`dir`, `options?`): `Promise`\<``null`` \| `string`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `dir` | `string` |
| `options?` | [`GitHeadOptions`](../interfaces/GitHeadOptions.md) |

##### Returns

`Promise`\<``null`` \| `string`\>

___

### getIgnored

• `Readonly` **getIgnored**: (`dir`: `string`) => `Promise`\<`string`[]\>

Get a list of all the files in the directory which are ignored by Git
(`.gitignore`).

#### Type declaration

▸ (`dir`): `Promise`\<`string`[]\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `dir` | `string` |

##### Returns

`Promise`\<`string`[]\>

___

### getIsDirty

• `Readonly` **getIsDirty**: (`dir`: `string`) => `Promise`\<`boolean`\>

Return true if the Git working tree is dirty.

#### Type declaration

▸ (`dir`): `Promise`\<`boolean`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `dir` | `string` |

##### Returns

`Promise`\<`boolean`\>

___

### getIsShallow

• `Readonly` **getIsShallow**: () => `Promise`\<`boolean`\>

Return true if the instance directory is a shallow Git clone.

#### Type declaration

▸ (): `Promise`\<`boolean`\>

##### Returns

`Promise`\<`boolean`\>

___

### getLogs

• `Readonly` **getLogs**: (`dir`: `string`, `options?`: [`GitLogOptions`](../interfaces/GitLogOptions.md)) => `Promise`\<[`GitLog`](../interfaces/GitLog.md)[]\>

Get Git log entries.

**Note:** This method will throw an error if the directory is part of a
shallow Git clone.

#### Type declaration

▸ (`dir`, `options?`): `Promise`\<[`GitLog`](../interfaces/GitLog.md)[]\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `dir` | `string` |
| `options?` | [`GitLogOptions`](../interfaces/GitLogOptions.md) |

##### Returns

`Promise`\<[`GitLog`](../interfaces/GitLog.md)[]\>

___

### getRoot

• `Readonly` **getRoot**: () => `Promise`\<`string`\>

Return the root directory of the Git repository.

#### Type declaration

▸ (): `Promise`\<`string`\>

##### Returns

`Promise`\<`string`\>
