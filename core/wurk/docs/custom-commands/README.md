Wurk Custom Commands

# Wurk Custom Commands

## Table of contents

### Functions

- [createCommand](README.md#createcommand)

### Classes

- [CommandContext](classes/CommandContext.md)
- [Workspace](classes/Workspace.md)
- [WorkspaceCollection](classes/WorkspaceCollection.md)

### Interfaces

- [CommandAction](interfaces/CommandAction.md)
- [CommandHooks](interfaces/CommandHooks.md)
- [WorkspaceCallback](interfaces/WorkspaceCallback.md)
- [WorkspaceCollectionOptions](interfaces/WorkspaceCollectionOptions.md)
- [WorkspaceLink](interfaces/WorkspaceLink.md)
- [WorkspaceLinkOptions](interfaces/WorkspaceLinkOptions.md)
- [WorkspaceOptions](interfaces/WorkspaceOptions.md)
- [WorkspacePrintStatusOptions](interfaces/WorkspacePrintStatusOptions.md)

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
| `hooks` | [`CommandHooks`](interfaces/CommandHooks.md)\<`TResult`, `TName`\> \| [`CommandAction`](interfaces/CommandAction.md)\<`EmptyResult`\> |

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
