[**Wurk API**](../README.md) • **Docs**

***

[Wurk API](../README.md) / createCommand

# Function: createCommand()

> **createCommand**\<`TName`, `TResult`\>(`name`, `hooks`): `unknown`

Create a Wurk command plugin.

## Type parameters

• **TName** *extends* `string`

• **TResult** *extends* `EmptyCliResult`

## Parameters

• **name**: `TName`

• **hooks**: [`CommandHooks`](../interfaces/CommandHooks.md)\<`TResult`, `TName`\> \| [`CommandActionCallback`](../type-aliases/CommandActionCallback.md)\<`EmptyCliResult`\>

## Returns

`unknown`

A Wurk command plugin. The type is `unknown` because its not
intended for direct use, and exporting the type would complicate typescript
type declaration output.

## Example

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
