[**Wurk API**](../README.md) • **Docs**

***

[Wurk API](../README.md) / CliOptionAction

# Type alias: CliOptionAction()\<TResult, TKey\>

> **CliOptionAction**\<`TResult`, `TKey`\>: (`context`) => `void` \| `Promise`\<`void`\>

Callback for performing an action when an option is parsed.

## Type parameters

• **TResult** *extends* `UnknownCliResult` = `UnknownCliResult`

• **TKey** *extends* keyof `InferCliResultOptions`\<`TResult`\> = keyof `InferCliResultOptions`\<`TResult`\>

## Parameters

• **context**

• **context.key**: `TKey`

• **context.result**: `PartialCliResult`\<`TResult`\>

• **context.value**: `Exclude`\<`InferCliResultOptions`\<`TResult`\>\[`TKey`\], `undefined`\>

## Returns

`void` \| `Promise`\<`void`\>
