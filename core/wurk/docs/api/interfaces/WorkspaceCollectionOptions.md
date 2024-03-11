[Wurk API](../README.md) / WorkspaceCollectionOptions

# Interface: WorkspaceCollectionOptions

Workspace collection options.

## Table of contents

### Properties

- [concurrency](WorkspaceCollectionOptions.md#concurrency)
- [defaultIterationMethod](WorkspaceCollectionOptions.md#defaultiterationmethod)
- [includeRootWorkspace](WorkspaceCollectionOptions.md#includerootworkspace)
- [log](WorkspaceCollectionOptions.md#log)
- [root](WorkspaceCollectionOptions.md#root)
- [rootDir](WorkspaceCollectionOptions.md#rootdir)
- [workspaces](WorkspaceCollectionOptions.md#workspaces)

## Properties

### concurrency

• `Optional` `Readonly` **concurrency**: `number`

Maximum workspaces which may be processed simultaneously using the
asynchronous `forEachStream()` method. Also affects the `forEach()`
method if the `defaultIterationMethod` option is set to `forEachStream`.

___

### defaultIterationMethod

• `Optional` `Readonly` **defaultIterationMethod**: ``"forEachParallel"`` \| ``"forEachStream"`` \| ``"forEachSequential"``

Default iteration method.

___

### includeRootWorkspace

• `Optional` `Readonly` **includeRootWorkspace**: `boolean`

Whether or not to include the root workspace in iteration.

___

### log

• `Optional` `Readonly` **log**: `Log`

Logger for workspace collection operations.

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
