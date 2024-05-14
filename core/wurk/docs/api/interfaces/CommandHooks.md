[**Wurk API**](../README.md) • **Docs**

***

[Wurk API](../README.md) / CommandHooks

# Interface: CommandHooks\<TResult, TName\>

Configuration for a Wurk command plugin.

## Type parameters

• **TResult** *extends* `EmptyCliResult`

• **TName** *extends* `string`

## Properties

### action

> `readonly` **action**: [`CommandActionCallback`](../type-aliases/CommandActionCallback.md)\<`TResult`\>

Command implementation.

***

### config?

> `optional` `readonly` **config**: [`CommandConfigCallback`](../type-aliases/CommandConfigCallback.md)\<`TResult`, `TName`\>

Configure command line options.
