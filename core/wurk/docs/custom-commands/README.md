Wurk Custom Commands

# Wurk Custom Commands

## Table of contents

### Functions

- [createCommand](README.md#createcommand)

### Classes

- [Context](classes/Context.md)

### Interfaces

- [CommandHooks](interfaces/CommandHooks.md)

### Type Aliases

- [CommandAction](README.md#commandaction)

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
| `hooks` | [`CommandHooks`](interfaces/CommandHooks.md)\<`TResult`, `TName`\> \| [`CommandAction`](README.md#commandaction)\<`EmptyResult`\> |

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

### CommandAction

Ƭ **CommandAction**\<`TResult`\>: (`context`: [`Context`](classes/Context.md)\<`TResult`\>) => `Promise`\<`void`\>

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
| `context` | [`Context`](classes/Context.md)\<`TResult`\> |

##### Returns

`Promise`\<`void`\>
