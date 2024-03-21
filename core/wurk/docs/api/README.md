Wurk API

# Wurk API

## Table of contents

### Functions

- [createCommand](README.md#createcommand)

### Classes

- [Cli](classes/Cli.md)
- [CommandContext](classes/CommandContext.md)
- [JsonAccessor](classes/JsonAccessor.md)
- [Workspace](classes/Workspace.md)
- [Workspaces](classes/Workspaces.md)

### Interfaces

- [CommandHooks](interfaces/CommandHooks.md)
- [HelpCli](interfaces/HelpCli.md)
- [HelpFormatter](interfaces/HelpFormatter.md)
- [Result](interfaces/Result.md)
- [WorkspaceLink](interfaces/WorkspaceLink.md)
- [WorkspaceLinkOptions](interfaces/WorkspaceLinkOptions.md)
- [WorkspaceOptions](interfaces/WorkspaceOptions.md)
- [WorkspacesOptions](interfaces/WorkspacesOptions.md)

### Type Aliases

- [Action](README.md#action)
- [CommandActionCallback](README.md#commandactioncallback)
- [CommandConfigCallback](README.md#commandconfigcallback)
- [OptionAction](README.md#optionaction)
- [WorkspaceCallback](README.md#workspacecallback)

## Functions

### createCommand

▸ **createCommand**\<`TName`, `TResult`\>(`name`, `hooks`): `unknown`

Create a Wurk command plugin.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TName` | extends `string` |
| `TResult` | extends `EmptyResult` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `TName` |
| `hooks` | [`CommandHooks`](interfaces/CommandHooks.md)\<`TResult`, `TName`\> \| [`CommandActionCallback`](README.md#commandactioncallback)\<`EmptyResult`\> |

#### Returns

`unknown`

A Wurk command plugin. The type is `unknown` because its not
intended for direct use, and exporting the type would complicate typescript
type declaration output.

**`Example`**

```ts
export default createCommand('my-command', {
  config: (cli) => {
    // Configure command line options (optional).
    return cli.option('-f, --foo <value>', 'Foo option');
  },
  action: async (context) => {
    // Iterate over workspaces, spawn processes, modify files, etc.
    context.workspaces.forEach(async (workspace) => {
      // Do something with each selected workspace.
    });
  },
});
```

## Type Aliases

### Action

Ƭ **Action**\<`TResult`\>: (`result`: `TResult`) => `void` \| (`result`: `TResult`) => `void` \| `Promise`\<`void`\> \| `Promise`\<`void` \| (`result`: `TResult`) => `void` \| `Promise`\<`void`\>\>

Callback for performing an action when a command is parsed.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TResult` | extends `UnknownResult` = `UnknownResult` |

#### Type declaration

▸ (`result`): `void` \| (`result`: `TResult`) => `void` \| `Promise`\<`void`\> \| `Promise`\<`void` \| (`result`: `TResult`) => `void` \| `Promise`\<`void`\>\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `result` | `TResult` |

##### Returns

`void` \| (`result`: `TResult`) => `void` \| `Promise`\<`void`\> \| `Promise`\<`void` \| (`result`: `TResult`) => `void` \| `Promise`\<`void`\>\>

___

### CommandActionCallback

Ƭ **CommandActionCallback**\<`TResult`\>: (`context`: [`CommandContext`](classes/CommandContext.md)\<`TResult`\>) => `Promise`\<`void`\>

Action callback for a Wurk command plugin.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TResult` | extends `EmptyResult` = `EmptyResult` |

#### Type declaration

▸ (`context`): `Promise`\<`void`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `context` | [`CommandContext`](classes/CommandContext.md)\<`TResult`\> |

##### Returns

`Promise`\<`void`\>

___

### CommandConfigCallback

Ƭ **CommandConfigCallback**\<`TResult`, `TName`\>: (`cli`: [`Cli`](classes/Cli.md)\<`EmptyResult`, `TName`\>, `config`: [`JsonAccessor`](classes/JsonAccessor.md)) => [`Cli`](classes/Cli.md)\<`TResult`, `TName`\>

Configuration callback for a Wurk command plugin.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TResult` | extends `EmptyResult` |
| `TName` | extends `string` |

#### Type declaration

▸ (`cli`, `config`): [`Cli`](classes/Cli.md)\<`TResult`, `TName`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `cli` | [`Cli`](classes/Cli.md)\<`EmptyResult`, `TName`\> |
| `config` | [`JsonAccessor`](classes/JsonAccessor.md) |

##### Returns

[`Cli`](classes/Cli.md)\<`TResult`, `TName`\>

___

### OptionAction

Ƭ **OptionAction**\<`TResult`, `TKey`\>: (`context`: \{ `key`: `TKey` ; `result`: `PartialResult`\<`TResult`\> ; `value`: `Exclude`\<`InferResultOptions`\<`TResult`\>[`TKey`], `undefined`\>  }) => `void` \| `Promise`\<`void`\>

Callback for performing an action when an option is parsed.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TResult` | extends `UnknownResult` = `UnknownResult` |
| `TKey` | extends keyof `InferResultOptions`\<`TResult`\> = keyof `InferResultOptions`\<`TResult`\> |

#### Type declaration

▸ (`context`): `void` \| `Promise`\<`void`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `context` | `Object` |
| `context.key` | `TKey` |
| `context.result` | `PartialResult`\<`TResult`\> |
| `context.value` | `Exclude`\<`InferResultOptions`\<`TResult`\>[`TKey`], `undefined`\> |

##### Returns

`void` \| `Promise`\<`void`\>

___

### WorkspaceCallback

Ƭ **WorkspaceCallback**: (`workspace`: [`Workspace`](classes/Workspace.md), `signal`: `AbortSignal`, `abort`: (`reason?`: `any`) => `void`) => `Promise`\<`void`\>

Workspace collection `forEach*` asynchronous callback.

#### Type declaration

▸ (`workspace`, `signal`, `abort`): `Promise`\<`void`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `workspace` | [`Workspace`](classes/Workspace.md) |
| `signal` | `AbortSignal` |
| `abort` | (`reason?`: `any`) => `void` |

##### Returns

`Promise`\<`void`\>
