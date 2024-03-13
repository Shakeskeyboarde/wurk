Wurk API

# Wurk API

## Table of contents

### Functions

- [createCommand](README.md#createcommand)

### Classes

- [CommandContext](classes/CommandContext.md)
- [Workspace](classes/Workspace.md)
- [Workspaces](classes/Workspaces.md)

### Interfaces

- [CommandHooks](interfaces/CommandHooks.md)
- [WorkspaceLink](interfaces/WorkspaceLink.md)
- [WorkspaceLinkOptions](interfaces/WorkspaceLinkOptions.md)
- [WorkspaceOptions](interfaces/WorkspaceOptions.md)
- [WorkspacesOptions](interfaces/WorkspacesOptions.md)

### Type Aliases

- [CommandActionCallback](README.md#commandactioncallback)
- [CommandConfigCallback](README.md#commandconfigcallback)
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
| `name` | `CliName`\<`TName`\> |
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

Ƭ **CommandConfigCallback**\<`TResult`, `TName`\>: (`cli`: `Cli`\<`EmptyResult`, `TName`\>, `config`: `JsonAccessor`) => `Cli`\<`TResult`, `TName`\>

Configuration callback for a Wurk command plugin.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TResult` | extends `EmptyResult` |
| `TName` | extends `string` |

#### Type declaration

▸ (`cli`, `config`): `Cli`\<`TResult`, `TName`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `cli` | `Cli`\<`EmptyResult`, `TName`\> |
| `config` | `JsonAccessor` |

##### Returns

`Cli`\<`TResult`, `TName`\>

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
