[Wurk Custom Commands](../README.md) / CommandHooks

# Interface: CommandHooks\<TResult, TName\>

Configuration for a Wurk command plugin.

## Type parameters

| Name | Type |
| :------ | :------ |
| `TResult` | extends `EmptyResult` |
| `TName` | extends `string` |

## Table of contents

### Properties

- [action](CommandHooks.md#action)
- [config](CommandHooks.md#config)

## Properties

### action

• `Readonly` **action**: [`CommandAction`](CommandAction.md)\<`TResult`\>

Command implementation.

___

### config

• `Optional` `Readonly` **config**: (`cli`: `Cli`\<`EmptyResult`, `TName`\>, `commandPackage`: `JsonAccessor`) => `Cli`\<`TResult`, `TName`\>

Configure command line options.

#### Type declaration

▸ (`cli`, `commandPackage`): `Cli`\<`TResult`, `TName`\>

Configure command line options.

##### Parameters

| Name | Type |
| :------ | :------ |
| `cli` | `Cli`\<`EmptyResult`, `TName`\> |
| `commandPackage` | `JsonAccessor` |

##### Returns

`Cli`\<`TResult`, `TName`\>
