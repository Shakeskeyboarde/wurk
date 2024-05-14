[**Wurk API**](../README.md) • **Docs**

***

[Wurk API](../README.md) / WorkspaceOptions

# Interface: WorkspaceOptions

Workspace configuration.

## Properties

### config

> `readonly` **config**: [`JsonAccessor`](../classes/JsonAccessor.md)

Workspace configuration (package.json).

***

### dir

> `readonly` **dir**: `string`

Absolute path of the workspace directory.

***

### getDependencyLinks()?

> `optional` `readonly` **getDependencyLinks**: (`options`?) => readonly [`WorkspaceLink`](WorkspaceLink.md)[]

Resolve links to local dependency workspaces.

#### Parameters

• **options?**: [`WorkspaceLinkOptions`](WorkspaceLinkOptions.md)

#### Returns

readonly [`WorkspaceLink`](WorkspaceLink.md)[]

***

### getDependentLinks()?

> `optional` `readonly` **getDependentLinks**: (`options`?) => readonly [`WorkspaceLink`](WorkspaceLink.md)[]

Resolve links to local dependent workspaces.

#### Parameters

• **options?**: [`WorkspaceLinkOptions`](WorkspaceLinkOptions.md)

#### Returns

readonly [`WorkspaceLink`](WorkspaceLink.md)[]

***

### getPublished()?

> `optional` `readonly` **getPublished**: () => `Promise`\<`null` \| [`WorkspacePublished`](WorkspacePublished.md)\>

Get publication information for the workspace. This will check the
NPM registry for the closest version which is less than or equal to (<=)
the current version.

Returns `null` if If the current version is less than all published
versions (or there are no published versions). Returns a metadata object
if the current version or a lesser version has been published. Compare
the returned metadata version to the workspace version to determine if
the exact current version has been published.

#### Returns

`Promise`\<`null` \| [`WorkspacePublished`](WorkspacePublished.md)\>

***

### isSelected?

> `optional` `readonly` **isSelected**: `boolean`

Initial selection state of the workspace.

***

### log?

> `optional` `readonly` **log**: [`Log`](../classes/Log.md)

Logger which should be used for messages related to the workspace.

***

### relativeDir?

> `optional` `readonly` **relativeDir**: `string`

Workspace directory relative to the root workspace.
