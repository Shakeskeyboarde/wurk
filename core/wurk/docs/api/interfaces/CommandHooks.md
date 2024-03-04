[Wurk API](../README.md) / CommandHooks

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

• `Readonly` **action**: [`CommandActionCallback`](../README.md#commandactioncallback)\<`TResult`\>

Command implementation.

___

### config

• `Optional` `Readonly` **config**: [`CommandConfigCallback`](../README.md#commandconfigcallback)\<`TResult`, `TName`\>

Configure command line options.
