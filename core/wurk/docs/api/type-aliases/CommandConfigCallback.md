[**Wurk API**](../README.md) • **Docs**

***

[Wurk API](../README.md) / CommandConfigCallback

# Type alias: CommandConfigCallback()\<TResult, TName\>

> **CommandConfigCallback**\<`TResult`, `TName`\>: (`cli`, `config`) => [`Cli`](../classes/Cli.md)\<`TResult`, `TName`\>

Configuration callback for a Wurk command plugin.

## Type parameters

• **TResult** *extends* `EmptyCliResult`

• **TName** *extends* `string`

## Parameters

• **cli**: [`Cli`](../classes/Cli.md)\<`EmptyCliResult`, `TName`\>

• **config**: [`JsonAccessor`](../classes/JsonAccessor.md)

## Returns

[`Cli`](../classes/Cli.md)\<`TResult`, `TName`\>
