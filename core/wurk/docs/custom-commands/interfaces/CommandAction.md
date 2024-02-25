[Wurk Custom Commands](../README.md) / CommandAction

# Interface: CommandAction\<TResult\>

Action callback for a Wurk command plugin.

## Type parameters

| Name | Type |
| :------ | :------ |
| `TResult` | extends `EmptyResult` = `EmptyResult` |

## Callable

### CommandAction

▸ **CommandAction**(`context`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `context` | [`CommandContext`](../classes/CommandContext.md)\<`TResult`\> |

#### Returns

`Promise`\<`void`\>
