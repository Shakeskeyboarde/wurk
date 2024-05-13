[**Wurk API**](../README.md) • **Docs**

***

[Wurk API](../README.md) / WorkspaceLinkOptions

# Interface: WorkspaceLinkOptions

Options for filtering workspace links.

## Properties

### filter()?

> `optional` `readonly` **filter**: (`link`) => `boolean`

If provided, filter the links. If a link is filtered, it will also stop
recursion from traversing the filtered link's transitive links.

#### Parameters

• **link**: [`WorkspaceLink`](WorkspaceLink.md)

#### Returns

`boolean`

***

### recursive?

> `optional` `readonly` **recursive**: `boolean`

If true, include transitive links.
