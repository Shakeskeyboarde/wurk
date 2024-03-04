[Wurk API](../README.md) / WorkspaceCollectionOptions

# Interface: WorkspaceCollectionOptions

Workspace collection options.

## Table of contents

### Properties

- [concurrency](WorkspaceCollectionOptions.md#concurrency)
- [includeRootWorkspace](WorkspaceCollectionOptions.md#includerootworkspace)
- [root](WorkspaceCollectionOptions.md#root)
- [rootDir](WorkspaceCollectionOptions.md#rootdir)
- [workspaces](WorkspaceCollectionOptions.md#workspaces)

## Properties

### concurrency

• `Optional` `Readonly` **concurrency**: `number`

Maximum workspaces which may be processed in parallel using the
asynchronous `forEach*` methods.

___

### includeRootWorkspace

• `Optional` `Readonly` **includeRootWorkspace**: `boolean`

Whether or not to include the root workspace in iteration.

___

### root

• `Readonly` **root**: `JsonAccessor`

The root workspace configuration (package.json).

___

### rootDir

• `Readonly` **rootDir**: `string`

The directory of the root workspace.

___

### workspaces

• `Optional` `Readonly` **workspaces**: readonly readonly [`string`, `JsonAccessor`][]

Array of workspace directories and configurations (package.json files).
