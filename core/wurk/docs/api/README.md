Wurk API

# Wurk API

## Table of contents

### Functions

- [createCommand](README.md#createcommand)

### Classes

- [Cli](classes/Cli.md)
- [CommandContext](classes/CommandContext.md)
- [Git](classes/Git.md)
- [JsonAccessor](classes/JsonAccessor.md)
- [Log](classes/Log.md)
- [SpawnExitCodeError](classes/SpawnExitCodeError.md)
- [Workspace](classes/Workspace.md)
- [Workspaces](classes/Workspaces.md)

### Interfaces

- [CliHelpDefinition](interfaces/CliHelpDefinition.md)
- [CliHelpFormatter](interfaces/CliHelpFormatter.md)
- [CliResult](interfaces/CliResult.md)
- [CommandContextOptions](interfaces/CommandContextOptions.md)
- [CommandHooks](interfaces/CommandHooks.md)
- [GitHeadOptions](interfaces/GitHeadOptions.md)
- [GitLog](interfaces/GitLog.md)
- [GitLogOptions](interfaces/GitLogOptions.md)
- [GitOptions](interfaces/GitOptions.md)
- [SpawnOptions](interfaces/SpawnOptions.md)
- [SpawnResult](interfaces/SpawnResult.md)
- [WorkspaceDependency](interfaces/WorkspaceDependency.md)
- [WorkspaceLink](interfaces/WorkspaceLink.md)
- [WorkspaceLinkOptions](interfaces/WorkspaceLinkOptions.md)
- [WorkspaceOptions](interfaces/WorkspaceOptions.md)
- [WorkspacePublished](interfaces/WorkspacePublished.md)
- [WorkspacesOptions](interfaces/WorkspacesOptions.md)

### Type Aliases

- [CliAction](README.md#cliaction)
- [CliOptionAction](README.md#clioptionaction)
- [CommandActionCallback](README.md#commandactioncallback)
- [CommandConfigCallback](README.md#commandconfigcallback)
- [WorkspaceCallback](README.md#workspacecallback)
- [WorkspaceDependencySpec](README.md#workspacedependencyspec)

## Functions

### createCommand

▸ **createCommand**\<`TName`, `TResult`\>(`name`, `hooks`): `unknown`

Create a Wurk command plugin.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TName` | extends `string` |
| `TResult` | extends `EmptyCliResult` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `TName` |
| `hooks` | [`CommandHooks`](interfaces/CommandHooks.md)\<`TResult`, `TName`\> \| [`CommandActionCallback`](README.md#commandactioncallback)\<`EmptyCliResult`\> |

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

### CliAction

Ƭ **CliAction**\<`TResult`\>: (`result`: `TResult`) => `void` \| (`result`: `TResult`) => `void` \| `Promise`\<`void`\> \| `Promise`\<`void` \| (`result`: `TResult`) => `void` \| `Promise`\<`void`\>\>

Callback for performing an action when a command is parsed.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TResult` | extends `UnknownCliResult` = `UnknownCliResult` |

#### Type declaration

▸ (`result`): `void` \| (`result`: `TResult`) => `void` \| `Promise`\<`void`\> \| `Promise`\<`void` \| (`result`: `TResult`) => `void` \| `Promise`\<`void`\>\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `result` | `TResult` |

##### Returns

`void` \| (`result`: `TResult`) => `void` \| `Promise`\<`void`\> \| `Promise`\<`void` \| (`result`: `TResult`) => `void` \| `Promise`\<`void`\>\>

___

### CliOptionAction

Ƭ **CliOptionAction**\<`TResult`, `TKey`\>: (`context`: \{ `key`: `TKey` ; `result`: `PartialCliResult`\<`TResult`\> ; `value`: `Exclude`\<`InferCliResultOptions`\<`TResult`\>[`TKey`], `undefined`\>  }) => `void` \| `Promise`\<`void`\>

Callback for performing an action when an option is parsed.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TResult` | extends `UnknownCliResult` = `UnknownCliResult` |
| `TKey` | extends keyof `InferCliResultOptions`\<`TResult`\> = keyof `InferCliResultOptions`\<`TResult`\> |

#### Type declaration

▸ (`context`): `void` \| `Promise`\<`void`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `context` | `Object` |
| `context.key` | `TKey` |
| `context.result` | `PartialCliResult`\<`TResult`\> |
| `context.value` | `Exclude`\<`InferCliResultOptions`\<`TResult`\>[`TKey`], `undefined`\> |

##### Returns

`void` \| `Promise`\<`void`\>

___

### CommandActionCallback

Ƭ **CommandActionCallback**\<`TResult`\>: (`context`: [`CommandContext`](classes/CommandContext.md)\<`TResult`\>) => `Promise`\<`void`\>

Action callback for a Wurk command plugin.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TResult` | extends `EmptyCliResult` = `EmptyCliResult` |

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

Ƭ **CommandConfigCallback**\<`TResult`, `TName`\>: (`cli`: [`Cli`](classes/Cli.md)\<`EmptyCliResult`, `TName`\>, `config`: [`JsonAccessor`](classes/JsonAccessor.md)) => [`Cli`](classes/Cli.md)\<`TResult`, `TName`\>

Configuration callback for a Wurk command plugin.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TResult` | extends `EmptyCliResult` |
| `TName` | extends `string` |

#### Type declaration

▸ (`cli`, `config`): [`Cli`](classes/Cli.md)\<`TResult`, `TName`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `cli` | [`Cli`](classes/Cli.md)\<`EmptyCliResult`, `TName`\> |
| `config` | [`JsonAccessor`](classes/JsonAccessor.md) |

##### Returns

[`Cli`](classes/Cli.md)\<`TResult`, `TName`\>

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

___

### WorkspaceDependencySpec

Ƭ **WorkspaceDependencySpec**: \{ `name`: `string` ; `range`: `string` ; `raw`: `string` ; `type`: ``"npm"`` \| ``"workspace"``  } \| \{ `protocol`: `string` ; `raw`: `string` ; `suffix`: `string` ; `type`: ``"url"``  }

A dependency specification parsed from a `package.json` file.
