[Wurk Custom Commands](../README.md) / WorkspaceCallback

# Interface: WorkspaceCallback

Workspace collection `forEach*` asynchronous callback.

## Callable

### WorkspaceCallback

▸ **WorkspaceCallback**(`workspace`, `signal`, `abort`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `workspace` | [`Workspace`](../classes/Workspace.md) |
| `signal` | `AbortSignal` |
| `abort` | (`reason?`: `any`) => `void` |

#### Returns

`Promise`\<`void`\>
