[Wurk API](../README.md) / WorkspaceLinkOptions

# Interface: WorkspaceLinkOptions

Options for filtering workspace links.

## Table of contents

### Properties

- [filter](WorkspaceLinkOptions.md#filter)
- [recursive](WorkspaceLinkOptions.md#recursive)

## Properties

### filter

• `Optional` `Readonly` **filter**: (`link`: [`WorkspaceLink`](WorkspaceLink.md)) => `boolean`

If provided, filter the links. If a link is filtered, it will also stop
recursion from traversing the filtered link's transitive links.

#### Type declaration

▸ (`link`): `boolean`

##### Parameters

| Name | Type |
| :------ | :------ |
| `link` | [`WorkspaceLink`](WorkspaceLink.md) |

##### Returns

`boolean`

___

### recursive

• `Optional` `Readonly` **recursive**: `boolean`

If true, include transitive links.
